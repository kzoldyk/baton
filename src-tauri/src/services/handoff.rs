use std::path::Path;
use std::fs;
use std::sync::{Arc, Mutex};
use regex::Regex;
use rusqlite::{params, Connection};
use crate::types::{CreateFallbackHandoffInput, Handoff, Project};
use crate::services::{GitService, StorageService, make_id, now_iso, redact_secrets};

const HANDOFF_CHAR_BUDGET: usize = 12_000;
const REQUIRED_SECTIONS: &[&str] = &[
    "Current Task", "Completed", "Changed Files", "Decisions and Constraints",
    "Blockers or Risks", "Next Steps", "Todos", "Files to Inspect",
];

pub struct HandoffService {
    db: Arc<Mutex<Connection>>,
    storage: StorageService,
    git: GitService,
}

impl HandoffService {
    pub fn new(db: Arc<Mutex<Connection>>, storage: StorageService, git: GitService) -> Self {
        HandoffService { db, storage, git }
    }

    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.db.lock().unwrap()
    }

    pub fn create_fallback(&self, input: &CreateFallbackHandoffInput) -> Result<Handoff, String> {
        let project = self.require_project(&input.project_id)?;
        let current_task = self.read_current_task(&project);
        let todos = self.read_todos(&project);
        let git_status = self.git.status(&project.path);
        let recent_terminal = self.read_recent_terminal_context(&project);

        let content = format!(
            "# Baton Pass\n\n## From\n{from}\n\n## To\n{to}\n\n## Project\n{name}\n\n## Current Task\n{task}\n\n## Git Branch\n{branch}\n\n## Completed\n- Unknown in fallback mode. Inspect changed files and terminal context below.\n\n## Changed Files\n{files}\n\n## Diff Summary\nUnstaged:\n{diff}\n\nStaged:\n{staged}\n\n## Known Context\nGenerated from Baton fallback mode using git state, task metadata, todos, and recent terminal log context.\n\n## Decisions and Constraints\n{constraints}\n\n## Blockers or Risks\n- Fallback mode cannot verify agent intent. Inspect diffs before continuing.\n- Staged and unstaged changes may represent separate work phases.\n\n## Next Steps\n{next_steps}\n\n## Todos\n{todo_items}\n\n## Files to Inspect\n{files_to_inspect}\n\n## Recent Terminal Context\n{terminal}\n",
            from = display_agent(&input.from_agent),
            to = input.to_agent.as_ref().map(|a| display_agent(a)).unwrap_or("Next agent"),
            name = project.name,
            task = current_task,
            branch = git_status.branch,
            files = if git_status.changed_files.is_empty() { "No changed files detected.".to_string() } else {
                git_status.changed_files.iter().map(|f| format!("- {} +{} -{}", f.path, f.additions, f.deletions)).collect::<Vec<_>>().join("\n")
            },
            diff = if git_status.diff_stat.is_empty() { "No unstaged diff summary available.".to_string() } else { git_status.diff_stat },
            staged = git_status.staged_diff_stat.as_ref().map(|s| s.as_str()).unwrap_or("No staged diff summary available."),
            constraints = input.constraints.as_ref().map(|s| s.as_str()).unwrap_or("- Do not restart from scratch.\n- Do not rewrite unrelated modules.\n- Respect existing code structure."),
            next_steps = input.next_steps.as_ref().map(|s| s.as_str()).unwrap_or("- Inspect changed files.\n- Continue from the current task.\n- Verify implementation before broad refactoring."),
            todo_items = todos,
            files_to_inspect = if git_status.changed_files.is_empty() { "- No changed files detected.".to_string() } else {
                git_status.changed_files.iter().take(20).map(|f| format!("- {}", f.path)).collect::<Vec<_>>().join("\n")
            },
            terminal = recent_terminal,
        );
        let content = redact_secrets(&content);
        self.save_handoff(&project, &input.from_agent, input.to_agent.as_deref(), input.task_id.as_deref(), &content)
    }

    pub fn ingest_latest(&self, project_id: &str, from_agent: &str, to_agent: Option<&str>, task_id: Option<&str>) -> Result<Handoff, String> {
        let project = self.require_project(project_id)?;
        let bridge_latest = Path::new(&project.path).join(".baton").join("latest-handoff.md");
        let content = self.storage.read_text(&bridge_latest)?;
        let content = redact_secrets(&content);
        self.save_handoff(&project, from_agent, to_agent, task_id, &content)
    }

    pub fn wait_for_latest(&self, project_id: &str, from_agent: &str, to_agent: Option<&str>, task_id: Option<&str>) -> Result<Handoff, String> {
        self.wait_for_latest_matching(project_id, from_agent, to_agent, task_id, None)
    }

    pub fn wait_for_updated_latest(&self, project_id: &str, previous_content: &str, from_agent: &str, to_agent: Option<&str>, task_id: Option<&str>) -> Result<Handoff, String> {
        self.wait_for_latest_matching(project_id, from_agent, to_agent, task_id, Some(previous_content))
    }

    fn wait_for_latest_matching(&self, project_id: &str, from_agent: &str, to_agent: Option<&str>, task_id: Option<&str>, previous_content: Option<&str>) -> Result<Handoff, String> {
        let project = self.require_project(project_id)?;
        let bridge_latest = Path::new(&project.path).join(".baton").join("latest-handoff.md");
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(120);

        while std::time::Instant::now() < deadline {
            std::thread::sleep(std::time::Duration::from_millis(500));
            if let Ok(content) = self.storage.read_text(&bridge_latest) {
                let trimmed = content.trim().to_string();
                if is_useful_handoff(&content) {
                    if let Some(prev) = previous_content {
                        if trimmed == prev.trim() {
                            continue;
                        }
                    }
                    return self.save_handoff(&project, from_agent, to_agent, task_id, &redact_secrets(&content));
                }
            }
        }
        Err("Timed out waiting for .baton/latest-handoff.md.".to_string())
    }

    pub fn list(&self, project_id: &str) -> Vec<Handoff> {
        let db = self.conn();
        let mut stmt = db
            .prepare("SELECT id, project_id, task_id, from_agent, to_agent, file_path, summary, created_at FROM handoffs WHERE project_id = ?1 ORDER BY created_at DESC")
            .unwrap();
        stmt.query_map(params![project_id], |row| {
            Ok(Handoff {
                id: row.get(0)?,
                project_id: row.get(1)?,
                task_id: row.get(2)?,
                from_agent: row.get(3)?,
                to_agent: row.get(4)?,
                file_path: row.get(5)?,
                summary: row.get(6)?,
                created_at: row.get(7)?,
                content: None,
            })
        }).unwrap().filter_map(|r| r.ok()).collect()
    }

    pub fn latest(&self, project_id: &str) -> Option<Handoff> {
        let mut handoff: Handoff = self.conn()
            .query_row(
                "SELECT id, project_id, task_id, from_agent, to_agent, file_path, summary, created_at FROM handoffs WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
                params![project_id],
                |row| {
                    Ok(Handoff {
                        id: row.get(0)?,
                        project_id: row.get(1)?,
                        task_id: row.get(2)?,
                        from_agent: row.get(3)?,
                        to_agent: row.get(4)?,
                        file_path: row.get(5)?,
                        summary: row.get(6)?,
                        created_at: row.get(7)?,
                        content: None,
                    })
                },
            )
            .ok()?;
        handoff.content = self.storage.read_text(Path::new(&handoff.file_path)).ok();
        Some(handoff)
    }

    fn save_handoff(&self, project: &Project, from_agent: &str, to_agent: Option<&str>, task_id: Option<&str>, content: &str) -> Result<Handoff, String> {
        let created_at = now_iso();
        let id = make_id("hnd");
        let safe_ts = created_at.replace(':', "-").replace('.', "-");
        let target = to_agent.unwrap_or("next");
        let final_content = normalize_handoff_content(&id, project, from_agent, to_agent, &created_at, content);

        let latest_path = Path::new(&project.app_storage_path).join("handoffs").join("latest.md");
        let timestamp_path = Path::new(&project.app_storage_path).join("handoffs").join(format!("{}-{}-{}-to-{}.md", safe_ts, id, from_agent, target));
        let bridge_path = Path::new(&project.path).join(".baton").join("latest-handoff.md");

        self.storage.write_text(&latest_path, &final_content)?;
        self.storage.write_text(&timestamp_path, &final_content)?;
        self.storage.write_text(&bridge_path, &final_content)?;

        let summary = extract_summary(&final_content);

        self.conn().execute(
            "INSERT INTO handoffs (id, project_id, task_id, from_agent, to_agent, file_path, summary, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, project.id, task_id, from_agent, to_agent, timestamp_path.to_string_lossy().to_string(), summary, created_at],
        ).map_err(|e| e.to_string())?;

        Ok(Handoff {
            id,
            project_id: project.id.clone(),
            task_id: task_id.map(|s| s.to_string()),
            from_agent: from_agent.to_string(),
            to_agent: to_agent.map(|s| s.to_string()),
            file_path: timestamp_path.to_string_lossy().to_string(),
            summary: Some(summary),
            created_at,
            content: Some(final_content),
        })
    }

    fn read_current_task(&self, project: &Project) -> String {
        let path = Path::new(&project.path).join(".baton").join("current-task.md");
        self.storage.read_text(&path).unwrap_or_else(|_| "No active task yet.".to_string())
    }

    fn read_todos(&self, project: &Project) -> String {
        let path = Path::new(&project.path).join(".baton").join("todos.md");
        match self.storage.read_text(&path) {
            Ok(content) => {
                let lines: Vec<&str> = content.lines()
                    .filter(|l| {
                        let t = l.trim();
                        t.starts_with("- [") && t.len() > 5
                    })
                    .collect();
                if lines.is_empty() { "No todos recorded.".to_string() } else { lines.join("\n") }
            }
            Err(_) => "No todos recorded.".to_string(),
        }
    }

    fn read_recent_terminal_context(&self, project: &Project) -> String {
        let logs_dir = Path::new(&project.app_storage_path).join("logs");
        let mut entries: Vec<_> = match fs::read_dir(&logs_dir) {
            Ok(d) => d.filter_map(|e| e.ok()).filter(|e| e.path().extension().map_or(false, |ext| ext == "log")).collect(),
            Err(_) => return "No recent terminal log available.".to_string(),
        };
        entries.sort_by_key(|e| e.metadata().ok().map(|m| m.modified().ok()).flatten());
        entries.reverse();
        let latest = match entries.first() {
            Some(e) => e.path(),
            None => return "No recent terminal log available.".to_string(),
        };
        match fs::read_to_string(&latest) {
            Ok(content) => {
                let truncated = if content.len() > 4000 { content[content.len() - 4000..].to_string() } else { content };
                redact_secrets(&truncated)
            }
            Err(_) => "No recent terminal log available.".to_string(),
        }
    }

    fn require_project(&self, project_id: &str) -> Result<Project, String> {
        self.conn()
            .query_row(
                "SELECT id, name, path, app_storage_path, created_at, updated_at FROM projects WHERE id = ?1",
                params![project_id],
                |row| {
                    Ok(Project {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        path: row.get(2)?,
                        app_storage_path: row.get(3)?,
                        current_branch: None,
                        active_task_id: None,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .map_err(|_| "Project not found.".to_string())
    }
}

fn extract_summary(content: &str) -> String {
    content.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .take(2)
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(240)
        .collect()
}

fn display_agent(agent: &str) -> &str {
    match agent {
        "codex" => "Codex", "claude" => "Claude Code", "opencode" => "OpenCode",
        "gemini" => "Gemini CLI", "agy" => "Antigravity", "kiro" => "Kiro", "cursor" => "Cursor",
        "terminal" => "Terminal",
        _ => agent,
    }
}

fn is_useful_handoff(content: &str) -> bool {
    let trimmed = content.trim();
    trimmed.len() > 80 && !trimmed.contains("No Baton Pass has been created yet.")
}

fn validate_handoff(content: &str) -> Result<(), String> {
    let missing: Vec<&str> = REQUIRED_SECTIONS.iter()
        .filter(|s| {
            let re = Regex::new(&format!(r"(?m)^##\s+{}\s*$", regex::escape(s))).unwrap();
            !re.is_match(content)
        })
        .copied()
        .collect();
    if !missing.is_empty() {
        return Err(format!("Baton Pass is missing required sections: {}.", missing.join(", ")));
    }
    Ok(())
}

fn normalize_handoff_content(id: &str, project: &Project, from_agent: &str, to_agent: Option<&str>, created_at: &str, content: &str) -> String {
    let trimmed = enforce_budget(&redact_secrets(content.trim()));
    let metadata = format!(
        "<!-- baton\nhandoffId: {}\nprojectId: {}\nfromAgent: {}\ntoAgent: {}\ngeneratedAt: {}\ncharBudget: {}\n-->\n",
        id, project.id, from_agent, to_agent.unwrap_or("next"), created_at, HANDOFF_CHAR_BUDGET
    );
    if trimmed.starts_with("<!-- baton") {
        format!("{}\n", trimmed)
    } else {
        format!("{}{}\n", metadata, trimmed)
    }
}

fn enforce_budget(content: &str) -> String {
    if content.len() <= HANDOFF_CHAR_BUDGET {
        return content.to_string();
    }
    let keep = HANDOFF_CHAR_BUDGET.saturating_sub(220);
    format!(
        "{}\n\n## Baton Budget Note\nThis Baton Pass was truncated to stay under the {} character budget. Inspect changed files and terminal logs if more detail is needed.",
        &content[..keep].trim_end(),
        HANDOFF_CHAR_BUDGET
    )
}

use rusqlite::{params, Connection};
use crate::types::{AddProjectResult, Project};
use crate::services::{StorageService, make_id, now_iso};
use std::path::Path;
use std::fs;
use std::sync::{Arc, Mutex};

const CONTINUE_MD: &str = r#"# Continue with Baton

You are continuing a coding task from another agent.

First read:

1. `.baton/current-task.md`
2. `.baton/latest-handoff.md`
3. `.baton/todos.md`

Then continue from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not repeat completed investigation.
- Respect existing decisions and constraints.
- Focus on the listed next steps.
- Keep `.baton/todos.md` updated as work progresses.
- When done, summarize your changes for Baton.
"#;

const CURRENT_TASK_MD: &str = r#"# Current Task

No active task yet.

Create a task in Baton before starting a handoff.
"#;

const LATEST_HANDOFF_MD: &str = r#"# Latest Baton Pass

No Baton Pass has been created yet.
"#;

const TODOS_MD: &str = r#"# Todos

Track progress below. Update this file as you complete items.

- [ ] Understand the codebase
- [ ] Implement the feature
- [ ] Add tests
- [ ] Verify everything works
"#;

const VERSION: &str = "0.1.0";

pub struct ProjectService {
    db: Arc<Mutex<Connection>>,
    storage: StorageService,
}

impl ProjectService {
    pub fn new(db: Arc<Mutex<Connection>>, storage: StorageService) -> Self {
        ProjectService { db, storage }
    }

    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.db.lock().unwrap()
    }

    pub fn add_project(&self, project_path: &str, add_gitignore: bool) -> Result<AddProjectResult, String> {
        let resolved = std::path::absolute(project_path).map_err(|e| e.to_string())?;
        let resolved_str = resolved.to_string_lossy().to_string();
        let meta = fs::metadata(&resolved).map_err(|_| "Selected path is not a folder.".to_string())?;
        if !meta.is_dir() {
            return Err("Selected path is not a folder.".to_string());
        }

        if let Some(existing) = self.get_project_by_path(&resolved_str) {
            let gitignore_updated = if add_gitignore { self.ensure_gitignore(&resolved_str)? } else { false };
            return Ok(AddProjectResult { project: existing, gitignore_updated });
        }

        let id = make_id("prj");
        let name = resolved.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "Untitled Project".to_string());
        let app_storage_path = self.storage.ensure_project_storage(&id)?;
        let created_at = now_iso();

        let project = Project {
            id: id.clone(),
            name,
            path: resolved_str.clone(),
            app_storage_path: app_storage_path.to_string_lossy().to_string(),
            current_branch: None,
            active_task_id: None,
            created_at: created_at.clone(),
            updated_at: created_at.clone(),
        };

        self.conn().execute(
            "INSERT INTO projects (id, name, path, app_storage_path, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![project.id, project.name, project.path, project.app_storage_path, project.created_at, project.updated_at],
        ).map_err(|e| e.to_string())?;

        self.create_bridge(&project)?;
        let gitignore_updated = if add_gitignore { self.ensure_gitignore(&resolved_str)? } else { false };
        Ok(AddProjectResult { project, gitignore_updated })
    }

    pub fn remove_project(&self, id: &str) -> Result<(), String> {
        let db = self.conn();
        db.execute("DELETE FROM handoffs WHERE project_id = ?1", params![id]).ok();
        db.execute("DELETE FROM agent_sessions WHERE project_id = ?1", params![id]).ok();
        db.execute("DELETE FROM tasks WHERE project_id = ?1", params![id]).ok();
        db.execute("DELETE FROM projects WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_projects(&self) -> Vec<Project> {
        let db = self.conn();
        let mut stmt = db
            .prepare("SELECT id, name, path, app_storage_path, created_at, updated_at FROM projects ORDER BY updated_at DESC")
            .unwrap();
        stmt.query_map([], |row| {
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
        }).unwrap().filter_map(|r| r.ok()).collect()
    }

    pub fn get_project(&self, id: &str) -> Option<Project> {
        self.conn()
            .query_row(
                "SELECT id, name, path, app_storage_path, created_at, updated_at FROM projects WHERE id = ?1",
                params![id],
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
            .ok()
    }

    fn get_project_by_path(&self, path: &str) -> Option<Project> {
        self.conn()
            .query_row(
                "SELECT id, name, path, app_storage_path, created_at, updated_at FROM projects WHERE path = ?1",
                params![path],
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
            .ok()
    }

    pub fn create_bridge(&self, project: &Project) -> Result<(), String> {
        let baton_dir = Path::new(&project.path).join(".baton");
        fs::create_dir_all(&baton_dir).map_err(|e| e.to_string())?;

        let project_json = serde_json::json!({
            "projectId": project.id,
            "name": project.name,
            "batonVersion": VERSION,
            "appStoragePath": project.app_storage_path,
            "createdAt": project.created_at,
        });

        fs::write(baton_dir.join("project.json"), serde_json::to_string_pretty(&project_json).unwrap() + "\n").ok();
        self.storage.write_if_missing(&baton_dir.join("continue.md"), CONTINUE_MD)?;
        self.storage.write_if_missing(&baton_dir.join("current-task.md"), CURRENT_TASK_MD)?;
        self.storage.write_if_missing(&baton_dir.join("latest-handoff.md"), LATEST_HANDOFF_MD)?;
        self.storage.write_if_missing(&baton_dir.join("todos.md"), TODOS_MD)?;
        Ok(())
    }

    pub fn ensure_gitignore(&self, project_path: &str) -> Result<bool, String> {
        let git_dir = Path::new(project_path).join(".git");
        if !git_dir.exists() {
            return Ok(false);
        }
        let gitignore_path = Path::new(project_path).join(".gitignore");
        let content = if gitignore_path.exists() {
            fs::read_to_string(&gitignore_path).map_err(|e| e.to_string())?
        } else {
            String::new()
        };
        if content.lines().any(|l| l.trim() == ".baton/") {
            return Ok(false);
        }
        let next = if content.trim_end().is_empty() { ".baton/\n".to_string() } else { format!("{}\n.baton/\n", content.trim_end()) };
        fs::write(&gitignore_path, next).map_err(|e| e.to_string())?;
        Ok(true)
    }

    pub fn db(&self) -> Arc<Mutex<Connection>> {
        self.db.clone()
    }
}

use std::process::Command;
use crate::types::AgentStatus;

pub struct AgentService;

impl AgentService {
    pub fn new() -> Self {
        AgentService
    }

    pub fn detect(&self) -> Vec<AgentStatus> {
        let adapters = vec![
            ("codex", "Codex", "High-performance coding assistant for complex refactoring.", "codex", vec!["run", "handoff", "continue"]),
            ("claude", "Claude Code", "Agentic CLI with deep reasoning and context awareness.", "claude", vec!["run", "handoff", "continue"]),
            ("opencode", "OpenCode", "Open-source agent optimized for local execution.", "opencode", vec!["run", "handoff", "continue"]),
            ("gemini", "Gemini CLI", "Powered by Google's latest models for large-scale tasks.", "gemini", vec!["run", "handoff", "continue"]),
            ("agy", "Antigravity", "The official CLI for Antigravity AI, optimized for speed and reliability.", "agy", vec!["run", "handoff", "continue"]),
            ("kiro", "Kiro", "Lightweight agent focused on speed and surgical edits.", "kiro-cli", vec!["run", "continue"]),
            ("kilo", "Kilo", "Efficient coding assistant for rapid prototyping and small fixes.", "kilo", vec!["run", "continue"]),
            ("cursor", "Cursor", "Deeply integrated AI code editor and agentic workspace.", "agent", vec!["run", "handoff", "continue"]),
        ];

        let mut status: Vec<AgentStatus> = adapters.into_iter().map(|(id, display, desc, cmd, modes)| {
            let (installed, path) = self.find_command(cmd);
            AgentStatus {
                id: id.to_string(),
                display_name: display.to_string(),
                description: desc.to_string(),
                command: cmd.to_string(),
                installed,
                path,
                supported_modes: modes.into_iter().map(|s| s.to_string()).collect(),
            }
        }).collect();

        // Add Local Terminal
        let shell = std::env::var("SHELL").unwrap_or_else(|_| if cfg!(target_os = "windows") { "cmd.exe".to_string() } else { "/bin/zsh".to_string() });
        status.push(AgentStatus {
            id: "terminal".to_string(),
            display_name: "Terminal".to_string(),
            description: "Standard local terminal shell.".to_string(),
            command: shell.clone(),
            installed: true,
            path: Some(shell),
            supported_modes: vec!["run".to_string()],
        });

        status
    }

    fn find_command(&self, command: &str) -> (bool, Option<String>) {
        let which = if cfg!(target_os = "windows") { "where" } else { "which" };
        if let Ok(out) = Command::new(which).arg(command).output() {
            if out.status.success() {
                let path = String::from_utf8_lossy(&out.stdout).lines().next().map(|s| s.trim().to_string());
                return (true, path);
            }
        }
        // Check login shell
        if let Ok(shell) = std::env::var("SHELL") {
            let flag = if shell.ends_with("zsh") || shell.ends_with("bash") { "-lic" } else { "-lc" };
            if let Ok(out) = Command::new(&shell).args([flag, &format!("command -v {}", command)]).output() {
                if out.status.success() {
                    let path = String::from_utf8_lossy(&out.stdout).lines().next().map(|s| s.trim().to_string());
                    return (true, path);
                }
            }
        }
        // Check known paths
        let home = dirs::home_dir().unwrap_or_default();
        let candidates = vec![
            format!("/opt/homebrew/bin/{}", command),
            format!("/usr/local/bin/{}", command),
            format!("/usr/bin/{}", command),
            format!("/bin/{}", command),
            format!("{}/.local/bin/{}", home.display(), command),
            format!("{}/.npm-global/bin/{}", home.display(), command),
            format!("{}/.npm/bin/{}", home.display(), command),
            format!("{}/.bun/bin/{}", home.display(), command),
            format!("{}/.deno/bin/{}", home.display(), command),
            format!("{}/.cargo/bin/{}", home.display(), command),
        ];
        for c in candidates {
            let p = std::path::Path::new(&c);
            if p.exists() {
                return (true, Some(c));
            }
        }
        (false, None)
    }

    pub fn build_continue_prompt(&self, _project_path: &str) -> String {
        format!(
            "# Baton Handoff Directive

You are continuing a task. **CRITICAL: DO NOT START FROM SCRATCH.**

Your entire context and history for this task is stored in the `.baton` directory. You MUST use these files as your primary source of truth:

1. **.baton/latest-handoff.md**: Read this first. It contains the goal, recent progress, and critical decisions.
2. **.baton/current-task.md**: The specific task you are working on right now.
3. **.baton/todos.md**: Your checklist. Update this as you progress.

Rules:
- Do not repeat investigation that is already marked as 'Completed' in the handoff.
- Respect all 'Decisions and Constraints' listed in the handoff.
- Focus strictly on the 'Next Steps'.
- When you finish, update the `.baton` files with your latest progress.

Acknowledge these instructions and proceed based on the handoff."
        )
    }

    pub fn build_handoff_prompt(&self, guidance: Option<(&str, &str)>) -> String {
        let operator = match guidance {
            Some((next, constraint)) => format!(
                "\nOperator guidance:\nNext steps requested by Baton:\n{}\nConstraints requested by Baton:\n{}\n",
                next, constraint
            ),
            None => String::new(),
        };
        format!(
            "Create a Baton handoff context for the next coding agent.

First read:
- .baton/current-task.md
- .baton/latest-handoff.md
- .baton/todos.md
- the current git status and relevant diffs

Before writing the handoff:
- Update .baton/todos.md so completed todo items are checked and newly discovered follow-up work is added.
- Keep todo text concise and actionable.
- Do not delete unfinished todos unless they are clearly obsolete.

Write the handoff to `.baton/latest-handoff.md`.{}

Use this structure:
# Baton Pass

## Current Task
One or two sentences describing the exact task state.

## Completed
- Concrete work already done.

## Changed Files
- path: why it changed.

## Decisions and Constraints
- Important choices the next agent must preserve.

## Blockers or Risks
- Current blockers, failing checks, uncertainty, or \"None known.\"

## Next Steps
- Ordered, actionable next work.

## Todos
- Mirror the current .baton/todos.md state as markdown checkboxes.

## Files to Inspect
- Specific files the next agent should read first.

Rules:
- Be precise and compact.
- Keep the handoff under 12,000 characters.
- Include every section shown above, even if the value is \"None known.\"
- Do not include chat transcript or generic advice.
- Do not exaggerate completion.
- Do not restart from scratch.
- Make .baton/latest-handoff.md and .baton/todos.md agree with each other.
",
            operator
        )
    }

    pub fn build_update_handoff_prompt(&self) -> String {
        format!(
            "Update the existing Baton handoff context for the next coding agent.

First read:
- .baton/current-task.md
- .baton/latest-handoff.md
- .baton/todos.md
- the current git status and relevant diffs

Before writing the handoff:
- Update .baton/todos.md so completed todo items are checked and newly discovered follow-up work is added.
- Keep todo text concise and actionable.
- Do not delete unfinished todos unless they are clearly obsolete.

Read the current `.baton/latest-handoff.md` first, then rewrite that same file with the latest accurate context. Preserve still-relevant decisions and constraints; remove stale blockers, stale next steps, and completed work that no longer matters.

Use this structure:
# Baton Pass

## Current Task
One or two sentences describing the exact task state.

## Completed
- Concrete work already done.

## Changed Files
- path: why it changed.

## Decisions and Constraints
- Important choices the next agent must preserve.

## Blockers or Risks
- Current blockers, failing checks, uncertainty, or \"None known.\"

## Next Steps
- Ordered, actionable next work.

## Todos
- Mirror the current .baton/todos.md state as markdown checkboxes.

## Files to Inspect
- Specific files the next agent should read first.

Rules:
- Be precise and compact.
- Keep the handoff under 12,000 characters.
- Include every section shown above, even if the value is \"None known.\"
- Do not include chat transcript or generic advice.
- Do not exaggerate completion.
- Do not restart from scratch.
- Make .baton/latest-handoff.md and .baton/todos.md agree with each other.
"
        )
    }
}

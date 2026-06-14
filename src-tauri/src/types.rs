use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub app_storage_path: String,
    pub current_branch: Option<String>,
    pub active_task_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatonTask {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub status: String,
    pub goal: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub text: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentStatus {
    pub id: String,
    pub display_name: String,
    pub description: String,
    pub command: String,
    pub installed: bool,
    pub path: Option<String>,
    pub supported_modes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSession {
    pub id: String,
    pub project_id: String,
    pub agent_id: String,
    pub task_id: Option<String>,
    pub name: Option<String>,
    pub status: Option<String>,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub log_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Handoff {
    pub id: String,
    pub project_id: String,
    pub task_id: Option<String>,
    pub from_agent: String,
    pub to_agent: Option<String>,
    pub file_path: String,
    pub summary: Option<String>,
    pub created_at: String,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    pub additions: i32,
    pub deletions: i32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: String,
    pub status_short: String,
    pub diff_stat: String,
    pub staged_diff_stat: Option<String>,
    pub name_status: String,
    pub staged_name_status: Option<String>,
    pub changed_files: Vec<ChangedFile>,
    pub additions: i32,
    pub deletions: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProjectResult {
    pub project: Project,
    pub gitignore_updated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFallbackHandoffInput {
    pub project_id: String,
    pub task_id: Option<String>,
    pub from_agent: String,
    pub to_agent: Option<String>,
    pub next_steps: Option<String>,
    pub constraints: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub name: String,
    pub status: String,
    pub detail: String,
    pub source: Option<String>,
}

use tauri::State;
use crate::AppState;
use crate::types::McpServer;

#[tauri::command]
pub fn list_mcp(state: State<'_, AppState>, project_id: Option<String>) -> Result<Vec<McpServer>, String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    let detected = agents.detect();
    let installed_commands: Vec<String> = detected.iter().filter(|a| a.installed).map(|a| a.command.clone()).collect();
    let mcp = state.mcp.lock().map_err(|e| e.to_string())?;

    let project_path = match &project_id {
        Some(id) => {
            let projects = state.projects.lock().map_err(|e| e.to_string())?;
            projects.get_project(id).map(|p| p.path.clone())
        }
        None => None,
    };

    Ok(mcp.list(&installed_commands, project_path.as_deref()))
}

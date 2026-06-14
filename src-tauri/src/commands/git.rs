use tauri::State;
use crate::AppState;
use crate::types::GitStatus;

#[tauri::command]
pub fn git_status(state: State<'_, AppState>, project_id: String) -> Result<GitStatus, String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    let project = projects.get_project(&project_id).ok_or_else(|| "Project not found.".to_string())?;
    let git = state.git.lock().map_err(|e| e.to_string())?;
    Ok(git.status(&project.path))
}

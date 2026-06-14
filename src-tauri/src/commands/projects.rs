use tauri::State;
use crate::AppState;
use crate::types::AddProjectResult;

#[tauri::command]
pub fn add_project(_state: State<'_, AppState>, _add_gitignore: Option<bool>) -> Result<AddProjectResult, String> {
    // We need a dialog for folder picker - handled differently in Tauri
    // For now, this command requires a path; the frontend calls addProjectPath instead
    Err("Use addProjectPath with a specific path.".to_string())
}

#[tauri::command]
pub fn add_project_path(state: State<'_, AppState>, project_path: String) -> Result<AddProjectResult, String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    projects.add_project(&project_path, true)
}

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<crate::types::Project>, String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    Ok(projects.list_projects())
}

#[tauri::command]
pub fn get_project(state: State<'_, AppState>, id: String) -> Result<Option<crate::types::Project>, String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    Ok(projects.get_project(&id))
}

#[tauri::command]
pub fn remove_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    projects.remove_project(&id)
}

use tauri::State;
use crate::AppState;
use crate::types::Handoff;

#[tauri::command]
pub fn create_fallback(state: State<'_, AppState>, input: crate::types::CreateFallbackHandoffInput) -> Result<Handoff, String> {
    let handoff = state.handoff.lock().map_err(|e| e.to_string())?;
    handoff.create_fallback(&input)
}

#[tauri::command]
pub fn ingest_latest(state: State<'_, AppState>, project_id: String, from_agent: String, to_agent: Option<String>, task_id: Option<String>) -> Result<Handoff, String> {
    let handoff = state.handoff.lock().map_err(|e| e.to_string())?;
    handoff.ingest_latest(&project_id, &from_agent, to_agent.as_deref(), task_id.as_deref())
}

#[tauri::command]
pub fn wait_for_latest(state: State<'_, AppState>, project_id: String, from_agent: String, to_agent: Option<String>, task_id: Option<String>) -> Result<Handoff, String> {
    let handoff = state.handoff.lock().map_err(|e| e.to_string())?;
    handoff.wait_for_latest(&project_id, &from_agent, to_agent.as_deref(), task_id.as_deref())
}

#[tauri::command]
pub fn wait_for_updated_latest(state: State<'_, AppState>, project_id: String, previous_content: String, from_agent: String, to_agent: Option<String>, task_id: Option<String>) -> Result<Handoff, String> {
    let handoff = state.handoff.lock().map_err(|e| e.to_string())?;
    handoff.wait_for_updated_latest(&project_id, &previous_content, &from_agent, to_agent.as_deref(), task_id.as_deref())
}

#[tauri::command]
pub fn get_latest_handoff(state: State<'_, AppState>, project_id: String) -> Result<Option<Handoff>, String> {
    let handoff = state.handoff.lock().map_err(|e| e.to_string())?;
    Ok(handoff.latest(&project_id))
}

#[tauri::command]
pub fn check_handoff_exists(state: State<'_, AppState>, project_id: String) -> Result<bool, String> {
    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    let project = projects.get_project(&project_id).ok_or_else(|| "Project not found".to_string())?;
    let path = std::path::Path::new(&project.path).join(".baton").join("latest-handoff.md");
    Ok(path.exists())
}

#[tauri::command]
pub fn list_handoffs(state: State<'_, AppState>, project_id: String) -> Result<Vec<Handoff>, String> {
    let handoff = state.handoff.lock().map_err(|e| e.to_string())?;
    Ok(handoff.list(&project_id))
}

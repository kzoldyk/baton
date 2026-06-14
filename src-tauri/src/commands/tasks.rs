use tauri::State;
use crate::AppState;
use crate::types::{BatonTask};

#[tauri::command]
pub fn create_task(state: State<'_, AppState>, project_id: String, title: String) -> Result<BatonTask, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    tasks.create(&project_id, &title)
}

#[tauri::command]
pub fn active_task(state: State<'_, AppState>, project_id: String) -> Result<Option<BatonTask>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.active(&project_id))
}

#[tauri::command]
pub fn list_tasks(state: State<'_, AppState>, project_id: String) -> Result<Vec<BatonTask>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.list(&project_id))
}

#[tauri::command]
pub fn update_task_status(state: State<'_, AppState>, task_id: String, status: String) -> Result<Option<BatonTask>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.update_status(&task_id, &status))
}

#[tauri::command]
pub fn delete_task(state: State<'_, AppState>, task_id: String) -> Result<(), String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    tasks.delete(&task_id);
    Ok(())
}

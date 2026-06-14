use tauri::State;
use crate::AppState;
use crate::types::Todo;

#[tauri::command]
pub fn list_todos(state: State<'_, AppState>, project_id: String) -> Result<Vec<Todo>, String> {
    let todos = state.todos.lock().map_err(|e| e.to_string())?;
    Ok(todos.list(&project_id))
}

#[tauri::command]
pub fn save_todos(state: State<'_, AppState>, project_id: String, todos: Vec<Todo>) -> Result<(), String> {
    let todos_svc = state.todos.lock().map_err(|e| e.to_string())?;
    todos_svc.save(&project_id, &todos);
    Ok(())
}

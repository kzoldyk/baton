use tauri::State;
use crate::AppState;
use crate::types::TerminalSession;

#[tauri::command]
pub fn list_sessions(state: State<'_, AppState>, project_id: String) -> Result<Vec<TerminalSession>, String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    Ok(terminal.list_for_project(&project_id))
}

#[tauri::command]
pub fn rename_session(state: State<'_, AppState>, session_id: String, name: String) -> Result<Option<TerminalSession>, String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    Ok(terminal.rename(&session_id, &name))
}

#[tauri::command]
pub fn delete_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    terminal.delete_session(&session_id);
    Ok(())
}

#[tauri::command]
pub fn close_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    terminal.close(&session_id);
    Ok(())
}

#[tauri::command]
pub fn read_log(state: State<'_, AppState>, session_id: String) -> Result<String, String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    Ok(terminal.read_log(&session_id))
}

#[tauri::command]
pub fn restore_session(state: State<'_, AppState>, session_id: String) -> Result<TerminalSession, String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    terminal.restore(&session_id)
}

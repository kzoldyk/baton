use tauri::State;
use crate::AppState;

#[tauri::command]
pub fn terminal_write(state: State<'_, AppState>, session_id: String, data: String) {
    let terminal = state.terminal.lock().ok();
    if let Some(t) = terminal {
        t.write(&session_id, &data);
    }
}

#[tauri::command]
pub fn terminal_resize(state: State<'_, AppState>, session_id: String, cols: u16, rows: u16) {
    let terminal = state.terminal.lock().ok();
    if let Some(t) = terminal {
        t.resize(&session_id, cols, rows);
    }
}

#[tauri::command]
pub fn terminal_kill(state: State<'_, AppState>, session_id: String) {
    let terminal = state.terminal.lock().ok();
    if let Some(t) = terminal {
        t.kill(&session_id);
    }
}

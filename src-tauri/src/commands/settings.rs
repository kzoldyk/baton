use tauri::State;
use crate::AppState;
use std::collections::HashMap;

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(settings.get(&key))
}

#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.set(&key, &value);
    Ok(())
}

#[tauri::command]
pub fn all_settings(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    // Get settings from DB
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    let mut map = settings.all();

    // Add user data path
    let storage = &state.storage;
    map.insert("userDataPath".to_string(), storage.user_data_path.to_string_lossy().to_string());

    // Check tmux availability
    let has_tmux = std::process::Command::new("/opt/homebrew/bin/tmux")
        .arg("-V").output().is_ok()
        || std::process::Command::new("/usr/local/bin/tmux")
            .arg("-V").output().is_ok()
        || std::process::Command::new("/usr/bin/tmux")
            .arg("-V").output().is_ok();
    map.insert("hasTmux".to_string(), if has_tmux { "true".to_string() } else { "false".to_string() });

    Ok(map)
}

use tauri::State;
use crate::AppState;
use crate::types::{AgentStatus, TerminalSession};

#[tauri::command]
pub fn detect_agents(state: State<'_, AppState>) -> Result<Vec<AgentStatus>, String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    Ok(agents.detect())
}

#[tauri::command]
pub fn run_agent(state: State<'_, AppState>, project_id: String, agent_id: String) -> Result<TerminalSession, String> {
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    terminal.start(&project_id, &agent_id)
}

#[tauri::command]
pub fn continue_agent(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    // Get session info from DB
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    let session = terminal.get_session(&session_id)
        .ok_or_else(|| "Session not found".to_string())?;

    let projects = state.projects.lock().map_err(|e| e.to_string())?;
    let project = projects.get_project(&session.project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    let prompt = agents.build_continue_prompt(&project.path);
    terminal.write(&session_id, &format!("{}\r", prompt));
    Ok(())
}

    #[tauri::command]
    pub fn handoff_prompt(state: State<'_, AppState>, session_id: String, next_steps: Option<String>, constraints: Option<String>) -> Result<(), String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    let guidance: Option<(&str, &str)> = match (&next_steps, &constraints) {
        (Some(n), Some(c)) => Some((n.as_str(), c.as_str())),
        _ => None,
    };
    let prompt = agents.build_handoff_prompt(guidance);
    terminal.write(&session_id, &prompt);
    Ok(())
    }

    #[tauri::command]
    pub fn update_handoff_prompt(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    let terminal = state.terminal.lock().map_err(|e| e.to_string())?;
    let prompt = agents.build_update_handoff_prompt();
    terminal.write(&session_id, &prompt);
    Ok(())
    }

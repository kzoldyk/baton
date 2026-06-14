mod commands;
mod services;
mod types;

use services::*;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub sqlite: Mutex<SqliteService>,
    pub storage: StorageService,
    pub projects: Mutex<ProjectService>,
    pub agents: Mutex<AgentService>,
    pub git: Mutex<GitService>,
    pub handoff: Mutex<HandoffService>,
    pub tasks: Mutex<TaskService>,
    pub terminal: Mutex<TerminalService>,
    pub settings: Mutex<SettingsService>,
    pub mcp: Mutex<McpService>,
    pub todos: Mutex<TodoService>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let storage = StorageService::new(app.path().app_data_dir()?);
            let sqlite = SqliteService::new(storage.db_path());
            let db = sqlite.db.clone();
            let projects = ProjectService::new(db.clone(), storage.clone());
            let agents = AgentService::new();
            let git = GitService::new();
            let handoff = HandoffService::new(db.clone(), storage.clone(), git.clone());
            let tasks = TaskService::new(db.clone(), storage.clone());
            let terminal = TerminalService::new(db.clone(), app.handle().clone());
            let settings = SettingsService::new(db.clone());
            let mcp = McpService::new();
            let todos = TodoService::new(db.clone(), storage.clone(), app.handle().clone());

            app.manage(AppState {
                sqlite: Mutex::new(sqlite),
                storage,
                projects: Mutex::new(projects),
                agents: Mutex::new(agents),
                git: Mutex::new(git),
                handoff: Mutex::new(handoff),
                tasks: Mutex::new(tasks),
                terminal: Mutex::new(terminal),
                settings: Mutex::new(settings),
                mcp: Mutex::new(mcp),
                todos: Mutex::new(todos),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::add_project,
            commands::projects::add_project_path,
            commands::projects::list_projects,
            commands::projects::get_project,
            commands::projects::remove_project,
            commands::agents::detect_agents,
            commands::agents::run_agent,
            commands::agents::continue_agent,
            commands::agents::handoff_prompt,
            commands::agents::update_handoff_prompt,
            commands::handoff::create_fallback,
            commands::handoff::ingest_latest,
            commands::handoff::check_handoff_exists,
            commands::handoff::wait_for_latest,
            commands::handoff::wait_for_updated_latest,
            commands::handoff::get_latest_handoff,
            commands::handoff::list_handoffs,
            commands::tasks::create_task,
            commands::tasks::active_task,
            commands::tasks::list_tasks,
            commands::tasks::update_task_status,
            commands::tasks::delete_task,
            commands::git::git_status,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::all_settings,
            commands::mcp::list_mcp,
            commands::sessions::list_sessions,
            commands::sessions::rename_session,
            commands::sessions::delete_session,
            commands::sessions::close_session,
            commands::sessions::read_log,
            commands::sessions::restore_session,
            commands::todos::list_todos,
            commands::todos::save_todos,
            commands::terminal::terminal_write,
            commands::terminal::terminal_resize,
            commands::terminal::terminal_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Baton");
}

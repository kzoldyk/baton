use crate::types::Todo;
use crate::services::StorageService;
use std::path::Path;
use std::fs;
use tauri::AppHandle;
use tauri::Emitter;
use std::thread;
use std::time::Duration;
use std::sync::{Arc, Mutex, OnceLock};
use rusqlite::{params, Connection};

static WATCHED_PROJECTS: OnceLock<Mutex<std::collections::HashSet<String>>> = OnceLock::new();

fn watched() -> &'static Mutex<std::collections::HashSet<String>> {
    WATCHED_PROJECTS.get_or_init(|| Mutex::new(std::collections::HashSet::new()))
}

pub struct TodoService {
    db: Arc<Mutex<Connection>>,
    storage: StorageService,
    app_handle: AppHandle,
}

impl TodoService {
    pub fn new(db: Arc<Mutex<Connection>>, storage: StorageService, app_handle: AppHandle) -> Self {
        TodoService { db, storage, app_handle }
    }

    pub fn list(&self, project_id: &str) -> Vec<Todo> {
        let path = self.todos_path(project_id);
        let content = if path.exists() {
            fs::read_to_string(&path).unwrap_or_default()
        } else {
            let default = "# Todos\n\nTrack progress below. Update this file as you complete items.\n\n- [ ] Understand the codebase\n- [ ] Implement the feature\n- [ ] Add tests\n- [ ] Verify everything works\n".to_string();
            self.storage.write_text(&path, &default).ok();
            default
        };
        self.spawn_watcher(project_id);
        parse_todos(&content)
    }

    pub fn save(&self, project_id: &str, todos: &[Todo]) {
        let path = self.todos_path(project_id);
        let content = format!(
            "# Todos\n\nTrack progress below. Update this file as you complete items.\n\n{}\n",
            todos.iter().map(|t| format!("- {} {}", if t.done { "[x]" } else { "[ ]" }, t.text)).collect::<Vec<_>>().join("\n")
        );
        self.storage.write_text(&path, &content).ok();
        let todos_vec = todos.to_vec();
        let pid = project_id.to_string();
        self.app_handle.emit("todos:updated", serde_json::json!({ "projectId": pid, "todos": todos_vec })).ok();
    }

    fn todos_path(&self, project_id: &str) -> std::path::PathBuf {
        let db = self.db.lock().unwrap();
        if let Ok(path) = db.query_row("SELECT path FROM projects WHERE id = ?1", params![project_id], |row| row.get::<_, String>(0)) {
            return Path::new(&path).join(".baton").join("todos.md");
        }
        Path::new("").join("todos.md")
    }

    fn spawn_watcher(&self, project_id: &str) {
        let mut watched = watched().lock().unwrap();
        if !watched.insert(project_id.to_string()) {
            return;
        }
        drop(watched);

        let path = self.todos_path(project_id);
        if !path.parent().map_or(false, |p| p.exists()) {
            return;
        }
        let pid = project_id.to_string();
        let app = self.app_handle.clone();
        thread::spawn(move || {
            let mut last_content = fs::read_to_string(&path).ok().unwrap_or_default();
            loop {
                thread::sleep(Duration::from_millis(2000));
                if let Ok(content) = fs::read_to_string(&path) {
                    if content != last_content {
                        last_content = content;
                        let todos = parse_todos(&last_content);
                        app.emit("todos:updated", serde_json::json!({ "projectId": pid, "todos": todos })).ok();
                    }
                }
            }
        });
    }
}

fn parse_todos(content: &str) -> Vec<Todo> {
    let mut todos = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("- [") && trimmed.len() > 5 {
            let done = trimmed.as_bytes().get(3) == Some(&b'x') || trimmed.as_bytes().get(3) == Some(&b'X');
            if let Some(text_start) = trimmed[5..].find(']') {
                let text = trimmed[5 + text_start + 1..].trim().to_string();
                if !text.is_empty() {
                    todos.push(Todo { text, done });
                }
            } else {
                let text = trimmed[5..].trim().to_string();
                if !text.is_empty() {
                    todos.push(Todo { text, done });
                }
            }
        }
    }
    todos
}

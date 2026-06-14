use rusqlite::{params, Connection};
use crate::types::BatonTask;
use crate::services::{StorageService, make_id, now_iso};
use std::sync::{Arc, Mutex};
use std::path::Path;

pub struct TaskService {
    db: Arc<Mutex<Connection>>,
    storage: StorageService,
}

impl TaskService {
    pub fn new(db: Arc<Mutex<Connection>>, storage: StorageService) -> Self {
        TaskService { db, storage }
    }

    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.db.lock().unwrap()
    }

    pub fn create(&self, project_id: &str, title: &str) -> Result<BatonTask, String> {
        let now = now_iso();
        let task = BatonTask {
            id: make_id("tsk"),
            project_id: project_id.to_string(),
            title: title.trim().to_string(),
            status: "active".to_string(),
            goal: None,
            created_at: now.clone(),
            updated_at: now,
        };
        if task.title.is_empty() {
            return Err("Task title is required.".to_string());
        }
        self.conn().execute(
            "INSERT INTO tasks (id, project_id, title, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![task.id, task.project_id, task.title, task.status, task.created_at, task.updated_at],
        ).map_err(|e| e.to_string())?;
        self.write_active_bridge(project_id);
        Ok(task)
    }

    pub fn list(&self, project_id: &str) -> Vec<BatonTask> {
        let db = self.conn();
        let mut stmt = db
            .prepare("SELECT id, project_id, title, status, created_at, updated_at FROM tasks WHERE project_id = ?1 ORDER BY status ASC, updated_at DESC")
            .unwrap();
        stmt.query_map(params![project_id], |row| {
            Ok(BatonTask {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                status: row.get(3)?,
                goal: None,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        }).unwrap().filter_map(|r| r.ok()).collect()
    }

    pub fn update_status(&self, task_id: &str, status: &str) -> Option<BatonTask> {
        let now = now_iso();
        let db = self.conn();
        db.execute("UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3", params![status, now, task_id]).ok()?;
        let task = self.get(task_id)?;
        self.write_active_bridge(&task.project_id);
        Some(task)
    }

    pub fn delete(&self, task_id: &str) {
        if let Ok(project_id) = self.conn().query_row::<String, _, _>(
            "SELECT project_id FROM tasks WHERE id = ?1", params![task_id], |row| row.get(0),
        ) {
            self.conn().execute("DELETE FROM tasks WHERE id = ?1", params![task_id]).ok();
            self.write_active_bridge(&project_id);
        }
    }

    pub fn active(&self, project_id: &str) -> Option<BatonTask> {
        self.conn()
            .query_row(
                "SELECT id, project_id, title, status, created_at, updated_at FROM tasks WHERE project_id = ?1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
                params![project_id],
                |row| {
                    Ok(BatonTask {
                        id: row.get(0)?,
                        project_id: row.get(1)?,
                        title: row.get(2)?,
                        status: row.get(3)?,
                        goal: None,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .ok()
    }

    fn get(&self, task_id: &str) -> Option<BatonTask> {
        self.conn()
            .query_row(
                "SELECT id, project_id, title, status, created_at, updated_at FROM tasks WHERE id = ?1",
                params![task_id],
                |row| {
                    Ok(BatonTask {
                        id: row.get(0)?,
                        project_id: row.get(1)?,
                        title: row.get(2)?,
                        status: row.get(3)?,
                        goal: None,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                },
            )
            .ok()
    }

    fn write_active_bridge(&self, project_id: &str) {
        if let Some((proj_path, storage_path)) = self.conn().query_row::<(String, String), _, _>(
            "SELECT path, app_storage_path FROM projects WHERE id = ?1", params![project_id], |row| Ok((row.get(0)?, row.get(1)?))
        ).ok() {
            let active = self.active(project_id);
            let content = match &active {
                Some(t) => format!("# Current Task\n\n{}\n", t.title),
                None => "# Current Task\n\nNo active task yet.\n\nCreate a task in Baton before starting a handoff.\n".to_string(),
            };
            let bridge_path = Path::new(&proj_path).join(".baton").join("current-task.md");
            let st_path = Path::new(&storage_path).join("current-task.md");
            self.storage.write_text(&bridge_path, &content).ok();
            self.storage.write_text(&st_path, &content).ok();
        }
    }

    pub fn db(&self) -> Arc<Mutex<Connection>> {
        self.db.clone()
    }
}

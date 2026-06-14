use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

pub struct SettingsService {
    db: Arc<Mutex<Connection>>,
}

impl SettingsService {
    pub fn new(db: Arc<Mutex<Connection>>) -> Self {
        SettingsService { db }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        let db = self.db.lock().unwrap();
        db.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |row| row.get(0))
            .ok()
    }

    pub fn set(&self, key: &str, value: &str) {
        let now = chrono::Utc::now().to_rfc3339();
        let db = self.db.lock().unwrap();
        db.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                params![key, value, now],
            )
            .ok();
    }

    pub fn all(&self) -> std::collections::HashMap<String, String> {
        let db = self.db.lock().unwrap();
        let mut stmt = db.prepare("SELECT key, value FROM settings").unwrap();
        let rows = stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        }).unwrap();
        let mut map = std::collections::HashMap::new();
        for row in rows.flatten() {
            map.insert(row.0, row.1);
        }
        map
    }
}

use std::path::{Path, PathBuf};
use std::fs;

#[derive(Clone)]
pub struct StorageService {
    pub user_data_path: PathBuf,
}

impl StorageService {
    pub fn new(user_data_path: PathBuf) -> Self {
        fs::create_dir_all(&user_data_path).ok();
        StorageService { user_data_path }
    }

    pub fn db_path(&self) -> PathBuf {
        self.user_data_path.join("baton.db")
    }

    pub fn project_path(&self, project_id: &str) -> PathBuf {
        self.user_data_path.join("projects").join(project_id)
    }

    pub fn ensure_project_storage(&self, project_id: &str) -> Result<PathBuf, String> {
        let root = self.project_path(project_id);
        let dirs = ["handoffs", "sessions", "logs", "context"];
        for dir in &dirs {
            fs::create_dir_all(root.join(dir)).map_err(|e| format!("Failed to create storage: {}", e))?;
        }
        let files = [
            ("project.md", "# Project\n\n"),
            ("current-task.md", "# Current Task\n\nNo active task yet.\n"),
            ("changed-files.md", "# Changed Files\n\n"),
            ("decisions.md", "# Decisions\n\n"),
            ("context/context-pack.md", "# Context Pack\n\n"),
        ];
        for (name, content) in &files {
            let fp = root.join(name);
            if !fp.exists() {
                self.write_text(&fp, content)?;
            }
        }
        Ok(root)
    }

    pub fn write_if_missing(&self, file_path: &Path, content: &str) -> Result<(), String> {
        if !file_path.exists() {
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
            }
            fs::write(file_path, content).map_err(|e| format!("Failed to write: {}", e))?;
        }
        Ok(())
    }

    pub fn write_text(&self, file_path: &Path, content: &str) -> Result<(), String> {
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
        }
        fs::write(file_path, content).map_err(|e| format!("Failed to write: {}", e))
    }

    pub fn read_text(&self, file_path: &Path) -> Result<String, String> {
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read: {}", e))
    }
}

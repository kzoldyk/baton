use rusqlite::{params, Connection};
use crate::types::TerminalSession;
use crate::services::{make_id, now_iso};
use std::collections::HashMap;
use std::fs;
use std::fs::OpenOptions;
use std::io::{Read, Seek, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};
use portable_pty::{CommandBuilder, PtySize, native_pty_system};

pub struct TerminalService {
    db: Arc<Mutex<Connection>>,
    writers: Mutex<HashMap<String, Box<dyn Write + Send>>>,
    masters: Mutex<HashMap<String, Box<dyn portable_pty::MasterPty + Send>>>,
    app_handle: AppHandle,
}

impl TerminalService {
    pub fn new(db: Arc<Mutex<Connection>>, app_handle: AppHandle) -> Self {
        TerminalService {
            db,
            writers: Mutex::new(HashMap::new()),
            masters: Mutex::new(HashMap::new()),
            app_handle,
        }
    }

    fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.db.lock().unwrap()
    }

    fn spawn_pty(&self, session_id: &str, executable: &str, cwd: &str, is_restore: bool) -> Result<(Box<dyn portable_pty::MasterPty + Send>, Box<dyn Read + Send + 'static>, Box<dyn Write + Send>, Box<dyn portable_pty::Child + Send>), String> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize { rows: 32, cols: 100, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| format!("Failed to create PTY: {}", e))?;

        let tmux_cmd = self.resolve_tmux_command();
        let mut cmd = if let Some(ref tmux) = tmux_cmd {
            let mut c = CommandBuilder::new(tmux);
            let tmux_session_name = format!("baton_{}", session_id);
            if is_restore {
                c.args(["attach-session", "-t", &tmux_session_name]);
            } else {
                // Use -A to attach if exists, -D to detach other clients
                c.args(["new-session", "-A", "-D", "-s", &tmux_session_name, executable]);
            }
            c
        } else {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
            let mut c = CommandBuilder::new(&shell);
            let flag = if shell.ends_with("zsh") || shell.ends_with("bash") { "-lic" } else { "-lc" };
            c.arg(flag);
            c.arg(&format!("export PATH={}:\"$PATH\" && exec {}", shell_quote(Path::new(executable).parent().and_then(|p| p.to_str()).unwrap_or("")), shell_quote(executable)));
            c
        };

        cmd.cwd(cwd);
        let exec_dir = Path::new(executable).parent().and_then(|p| p.to_str()).unwrap_or("");
        let path = std::env::var("PATH").unwrap_or_default();
        
        // Hardened environment for better TTY rendering and color support
        cmd.env("PATH", format!("{}:{}:{}", exec_dir, path, "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"));
        cmd.env("BATON_AGENT_EXECUTABLE", executable);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("FORCE_COLOR", "1");
        cmd.env("CLICOLOR_FORCE", "1");
        cmd.env("PAGER", "cat"); // Prevent blocking in PTY

        let child = pair.slave.spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn process: {}", e))?;

        let reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to get PTY reader: {}", e))?;
        let writer = pair.master.take_writer().map_err(|e| format!("Failed to get PTY writer: {}", e))?;

        Ok((pair.master, reader, writer, child))
    }

    pub fn start(&self, project_id: &str, agent_id: &str) -> Result<TerminalSession, String> {
        let project = self.get_project(project_id)?;
        let executable = self.resolve_executable(agent_id)?;
        let session_id = make_id("ses");
        let log_path = Path::new(&project.1).join("logs").join(format!("{}-{}.log", agent_id, session_id));

        let existing_count: i64 = self.conn()
            .query_row(
                "SELECT COUNT(*) FROM agent_sessions WHERE project_id = ?1 AND agent_name = ?2",
                params![project_id, agent_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let default_name = if existing_count == 0 {
            display_agent(agent_id).to_string()
        } else {
            format!("{} #{}", display_agent(agent_id), existing_count + 1)
        };

        let now = now_iso();
        let log_path_str = log_path.to_string_lossy().to_string();
        let session = TerminalSession {
            id: session_id.clone(),
            project_id: project_id.to_string(),
            agent_id: agent_id.to_string(),
            task_id: None,
            name: Some(default_name),
            status: Some("running".to_string()),
            started_at: Some(now.clone()),
            ended_at: None,
            log_path: Some(log_path_str.clone()),
        };

        self.conn().execute(
            "INSERT INTO agent_sessions (id, project_id, agent_name, name, status, started_at, log_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![session_id, project_id, agent_id, session.name, "running", now, log_path_str],
        ).ok();

        let (master, reader, writer, mut child) = self.spawn_pty(&session_id, &executable, &project.0, false)?;

        let mut writers = self.writers.lock().unwrap();
        writers.insert(session_id.clone(), writer);
        let mut masters = self.masters.lock().unwrap();
        masters.insert(session_id.clone(), master);

        let app = self.app_handle.clone();
        let sid = session_id.clone();
        let log_path_clone = log_path.clone();
        let db = self.db.clone();
        let tmux_cmd = self.resolve_tmux_command();

        thread::spawn(move || {
            let mut log_file = OpenOptions::new().create(true).append(true).open(&log_path_clone).ok();
            let mut buf = [0u8; 4096];
            let mut reader = reader;
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        if !data.is_empty() {
                            app.emit("terminal:data", serde_json::json!({ "sessionId": &sid, "data": &data })).ok();
                            if let Some(ref mut file) = log_file {
                                let _ = file.write_all(&buf[..n]);
                                let _ = file.flush();
                            }
                        }
                    }
                    Err(_) => break,
                }
            }

            let exit_code = child.wait().ok().map(|s| s.exit_code() as i32).unwrap_or(-1);
            db.lock().unwrap().execute(
                "UPDATE agent_sessions SET status = ?1, ended_at = ?2 WHERE id = ?3",
                params![if exit_code == 0 { "completed" } else { "failed" }, now_iso(), sid],
            ).ok();
            if let Some(ref tmux) = tmux_cmd {
                let _ = std::process::Command::new(tmux).args(["kill-session", "-t", &format!("baton_{}", sid)]).output();
            }
            app.emit("terminal:exit", serde_json::json!({ "sessionId": &sid, "exitCode": exit_code })).ok();
        });

        Ok(session)
    }

    pub fn restore(&self, session_id: &str) -> Result<TerminalSession, String> {
        let row = self.conn().query_row::<(String, String, String), _, _>(
            "SELECT project_id, agent_name, log_path FROM agent_sessions WHERE id = ?1",
            params![session_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        ).map_err(|_| "Session not found.".to_string())?;

        self.conn().execute("UPDATE agent_sessions SET status = 'running', ended_at = NULL WHERE id = ?1", params![session_id]).ok();

        let project = self.get_project(&row.0)?;
        let executable = self.resolve_executable(&row.1)?;

        let (master, reader, writer, mut child) = self.spawn_pty(session_id, &executable, &project.0, true)?;

        let log_path_value = row.2.clone();
        let session = TerminalSession {
            id: session_id.to_string(),
            project_id: row.0,
            agent_id: row.1,
            task_id: None,
            name: None,
            status: Some("running".to_string()),
            started_at: Some(now_iso()),
            ended_at: None,
            log_path: Some(row.2),
        };

        let mut writers = self.writers.lock().unwrap();
        writers.insert(session_id.to_string(), writer);
        let mut masters = self.masters.lock().unwrap();
        masters.insert(session_id.to_string(), master);
        drop(writers);
        drop(masters);

        let app = self.app_handle.clone();
        let sid = session_id.to_string();
        let db = self.db.clone();
        let tmux_cmd = self.resolve_tmux_command();

        thread::spawn(move || {
            let mut log_file = OpenOptions::new().create(true).append(true).open(&log_path_value).ok();
            let mut buf = [0u8; 4096];
            let mut reader = reader;
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        if !data.is_empty() {
                            app.emit("terminal:data", serde_json::json!({ "sessionId": &sid, "data": &data })).ok();
                            if let Some(ref mut file) = log_file {
                                let _ = file.write_all(&buf[..n]);
                                let _ = file.flush();
                            }
                        }
                    }
                    Err(_) => break,
                }
            }

            let exit_code = child.wait().ok().map(|s| s.exit_code() as i32).unwrap_or(-1);
            db.lock().unwrap().execute(
                "UPDATE agent_sessions SET status = ?1, ended_at = ?2 WHERE id = ?3",
                params![if exit_code == 0 { "completed" } else { "failed" }, now_iso(), sid],
            ).ok();
            if let Some(ref tmux) = tmux_cmd {
                let _ = std::process::Command::new(tmux).args(["kill-session", "-t", &format!("baton_{}", sid)]).output();
            }
            app.emit("terminal:exit", serde_json::json!({ "sessionId": &sid, "exitCode": exit_code })).ok();
        });

        Ok(session)
    }

    pub fn write(&self, session_id: &str, data: &str) {
        let mut writers = self.writers.lock().unwrap();
        if let Some(writer) = writers.get_mut(session_id) {
            let _ = writer.write_all(data.as_bytes());
            let _ = writer.flush();
        }
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) {
        // 1. Resize the PTY master
        let masters = self.masters.lock().unwrap();
        if let Some(master) = masters.get(session_id) {
            let _ = master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 });
        }
        drop(masters);

        // 2. If using tmux, force tmux to resize its internal window
        if let Some(tmux) = self.resolve_tmux_command() {
            let tmux_session_name = format!("baton_{}", session_id);
            // We set window-size to manual and then resize to match exact xterm dimensions
            let _ = std::process::Command::new(&tmux)
                .args(["set-option", "-t", &tmux_session_name, "window-size", "manual"])
                .output();
            let _ = std::process::Command::new(&tmux)
                .args(["resize-window", "-t", &tmux_session_name, "-x", &cols.to_string(), "-y", &rows.to_string()])
                .output();
        }
    }

    pub fn kill(&self, session_id: &str) {
        let mut writers = self.writers.lock().unwrap();
        writers.remove(session_id);
        let mut masters = self.masters.lock().unwrap();
        masters.remove(session_id);
        if let Some(tmux) = self.resolve_tmux_command() {
            let _ = std::process::Command::new(tmux).args(["kill-session", "-t", &format!("baton_{}", session_id)]).output();
        }
        self.conn().execute("UPDATE agent_sessions SET status = 'completed', ended_at = ?1 WHERE id = ?2",
            params![now_iso(), session_id]).ok();
    }

    pub fn close(&self, session_id: &str) {
        self.kill(session_id);
    }

    pub fn delete_session(&self, session_id: &str) {
        self.kill(session_id);
        self.conn().execute("DELETE FROM agent_sessions WHERE id = ?1", params![session_id]).ok();
    }

    pub fn list_for_project(&self, project_id: &str) -> Vec<TerminalSession> {
        let db = self.conn();
        let mut stmt = db
            .prepare("SELECT id, project_id, agent_name, name, status, started_at, ended_at, log_path FROM agent_sessions WHERE project_id = ?1 AND status != 'completed' ORDER BY started_at DESC")
            .unwrap();
        stmt.query_map(params![project_id], |row| {
            Ok(TerminalSession {
                id: row.get(0)?,
                project_id: row.get(1)?,
                agent_id: row.get(2)?,
                task_id: None,
                name: row.get(3)?,
                status: row.get(4)?,
                started_at: row.get(5)?,
                ended_at: row.get(6)?,
                log_path: row.get(7)?,
            })
        }).unwrap().filter_map(|r| r.ok()).collect()
    }

    pub fn rename(&self, session_id: &str, name: &str) -> Option<TerminalSession> {
        self.conn().execute("UPDATE agent_sessions SET name = ?1 WHERE id = ?2", params![name, session_id]).ok()?;
        self.get_session(session_id)
    }

    pub fn mark_stale_sessions(&self) {
        let running: Vec<String> = self.conn()
            .prepare("SELECT id FROM agent_sessions WHERE status = 'running'")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        
        let tmux_cmd = self.resolve_tmux_command();
        for id in &running {
            let mut is_alive = false;
            if let Some(ref tmux) = tmux_cmd {
                if let Ok(out) = std::process::Command::new(tmux).args(["has-session", "-t", &format!("baton_{}", id)]).output() {
                    if out.status.success() {
                        is_alive = true;
                    }
                }
            }
            if !is_alive {
                self.conn().execute("UPDATE agent_sessions SET status = 'failed', ended_at = ?1 WHERE id = ?2",
                    params![now_iso(), id]).ok();
            }
        }
    }

    pub fn read_log(&self, session_id: &str) -> String {
        let log_path: Option<String> = self.conn()
            .query_row("SELECT log_path FROM agent_sessions WHERE id = ?1", params![session_id], |row| row.get(0))
            .ok();
        match log_path {
            Some(path) => {
                let max_bytes: usize = 500_000;
                match fs::metadata(&path) {
                    Ok(meta) => {
                        let size = meta.len() as usize;
                        let read_offset = size.saturating_sub(max_bytes);
                        let mut file = match fs::File::open(&path) {
                            Ok(f) => f,
                            Err(_) => return String::new(),
                        };
                        let _ = file.seek(std::io::SeekFrom::Start(read_offset as u64));
                        let to_read = size - read_offset;
                        let mut buf = vec![0u8; to_read.max(1)];
                        if file.read_exact(&mut buf).is_ok() {
                            String::from_utf8_lossy(&buf).to_string()
                        } else {
                            String::new()
                        }
                    }
                    Err(_) => String::new(),
                }
            }
            None => String::new(),
        }
    }

    fn get_project(&self, project_id: &str) -> Result<(String, String), String> {
        self.conn()
            .query_row(
                "SELECT path, app_storage_path FROM projects WHERE id = ?1",
                params![project_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .map_err(|_| "Project not found.".to_string())
    }

    pub fn get_session(&self, session_id: &str) -> Option<TerminalSession> {
        self.conn()
            .query_row(
                "SELECT id, project_id, agent_name, name, status, started_at, ended_at, log_path FROM agent_sessions WHERE id = ?1",
                params![session_id],
                |row| {
                    Ok(TerminalSession {
                        id: row.get(0)?, project_id: row.get(1)?, agent_id: row.get(2)?,
                        task_id: None, name: row.get(3)?, status: row.get(4)?,
                        started_at: row.get(5)?, ended_at: row.get(6)?, log_path: row.get(7)?,
                    })
                },
            )
            .ok()
    }

    fn resolve_executable(&self, agent_id: &str) -> Result<String, String> {
        if agent_id == "terminal" {
            return Ok(std::env::var("SHELL").unwrap_or_else(|_| if cfg!(target_os = "windows") { "cmd.exe".to_string() } else { "/bin/zsh".to_string() }));
        }

        let command = match agent_id {
            "codex" => "codex", "claude" => "claude", "opencode" => "opencode",
            "gemini" => "gemini", "agy" => "agy", "kiro" => "kiro-cli", "kilo" => "kilo", "cursor" => "agent",
            _ => return Err(format!("Unknown agent: {}", agent_id)),
        };

        if let Ok(out) = std::process::Command::new("which").arg(command).output() {
            if out.status.success() {
                if let Some(path) = String::from_utf8_lossy(&out.stdout).lines().next() {
                    let p = path.trim().to_string();
                    if !p.is_empty() { return Ok(p); }
                }
            }
        }

        if let Ok(shell) = std::env::var("SHELL") {
            let flag = if shell.ends_with("zsh") || shell.ends_with("bash") { "-lic" } else { "-lc" };
            if let Ok(out) = std::process::Command::new(&shell).args([flag, &format!("command -v {}", command)]).output() {
                if out.status.success() {
                    if let Some(path) = String::from_utf8_lossy(&out.stdout).lines().next() {
                        let p = path.trim().to_string();
                        if !p.is_empty() { return Ok(p); }
                    }
                }
            }
        }

        let home = dirs::home_dir().unwrap_or_default();
        for c in [
            format!("/opt/homebrew/bin/{}", command),
            format!("/usr/local/bin/{}", command),
            format!("/usr/bin/{}", command),
            format!("/bin/{}", command),
            format!("{}/.local/bin/{}", home.display(), command),
            format!("{}/.npm-global/bin/{}", home.display(), command),
        ] {
            if Path::new(&c).exists() { return Ok(c); }
        }

        if agent_id == "cursor" || agent_id == "agent" {
            for c in [
                "/Applications/Cursor.app/Contents/Resources/app/bin/cursor".to_string(),
                "/Applications/Cursor.app/Contents/Resources/app/bin/agent".to_string(),
                format!("{}/Applications/Cursor.app/Contents/Resources/app/bin/cursor", home.display()),
                format!("{}/Applications/Cursor.app/Contents/Resources/app/bin/agent", home.display()),
            ] {
                if Path::new(&c).exists() { return Ok(c); }
            }
        }

        Err(format!("{} is not installed or not available on PATH.", display_agent(agent_id)))
    }

    fn resolve_tmux_command(&self) -> Option<String> {
        let mut candidates = vec![
            "/opt/homebrew/bin/tmux".to_string(),
            "/usr/local/bin/tmux".to_string(),
            "/usr/bin/tmux".to_string(),
            "/bin/tmux".to_string(),
        ];

        // Add bundled tmux on Linux
        if cfg!(target_os = "linux") {
            let cwd = std::env::current_dir().unwrap_or_default();
            candidates.insert(0, cwd.join("bin/tmux/tmux-linux-x64").to_string_lossy().to_string());
        }

        for c in candidates {
            if Path::new(&c).exists() {
                return Some(c);
            }
        }

        // Try which tmux
        if let Ok(out) = std::process::Command::new("which").arg("tmux").output() {
            if out.status.success() {
                let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !path.is_empty() { return Some(path); }
            }
        }

        None
    }
}

fn display_agent(agent: &str) -> &str {
    match agent {
        "codex" => "Codex", "claude" => "Claude Code", "opencode" => "OpenCode",
        "gemini" => "Gemini CLI", "agy" => "Antigravity", "kiro" => "Kiro", "kilo" => "Kilo", "cursor" => "Cursor",
        "terminal" => "Terminal",
        _ => agent,
    }
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

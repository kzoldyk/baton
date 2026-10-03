//! Stack-agnostic command and event names. Keep these if the shell moves
//! from Electron IPC to Tauri invoke/listen.

pub mod cmd {
    pub const PROJECT_ADD: &str = "project.add";
    pub const PROJECT_LIST: &str = "project.list";
    pub const TOOLS_DETECT: &str = "tools.detect";
    pub const SESSION_START: &str = "session.start";
    pub const SESSION_WRITE: &str = "session.write";
    pub const SESSION_RESIZE: &str = "session.resize";
    pub const SESSION_STOP: &str = "session.stop";
    pub const PASS_DRAFT: &str = "pass.draft";
    pub const PASS_UPDATE: &str = "pass.update";
    pub const PASS_ACCEPT: &str = "pass.accept";
    pub const SESSION_START_FROM_PASS: &str = "session.startFromPass";
    pub const MEMORY_LIST: &str = "memory.list";
    pub const MEMORY_PIN: &str = "memory.pin";
    pub const MEMORY_ACCEPT: &str = "memory.accept";
}

pub mod evt {
    pub const PTY_DATA: &str = "pty.data";
    pub const SESSION_STATUS: &str = "session.status";
    pub const TOOLS_UPDATED: &str = "tools.updated";
    pub const PASS_CHANGED: &str = "pass.changed";
    pub const CLAIM_DENIED: &str = "claim.denied";
}

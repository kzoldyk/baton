pub mod adapters;
pub mod context;
pub mod db;
pub mod ipc;
pub mod memory;
pub mod pass;
pub mod project;
pub mod pty;
pub mod session;
pub mod tmux;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ipc_names_are_stable() {
        assert_eq!(ipc::cmd::SESSION_START, "session.start");
        assert_eq!(ipc::evt::PTY_DATA, "pty.data");
    }

    #[test]
    fn adapters_default_unknown() {
        let caps = adapters::unknown_by_default();
        assert!(matches!(caps.skip_permissions, adapters::Capability::Unknown));
    }
}

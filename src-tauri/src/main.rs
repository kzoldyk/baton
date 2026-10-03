fn main() {
    // Window shell (Tauri overlay titlebar) is wired after this core crate is stable.
    let _ = baton_lib::ipc::cmd::SESSION_START;
    println!("baton core skeleton");
}

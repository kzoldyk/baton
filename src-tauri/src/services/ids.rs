use uuid::Uuid;

pub fn make_id(prefix: &str) -> String {
    format!("{}_{}", prefix, Uuid::new_v4().to_string().replace('-', "")[..16].to_string())
}

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

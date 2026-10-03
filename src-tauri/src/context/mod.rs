//! Adapter-declared context pressure. Never auto-kill a session.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Known {
    Known,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct ContextStatus {
    pub usage: Option<f32>,
    pub limit: Option<u32>,
    pub pressure: Option<f32>,
    pub confidence: Option<String>,
}

pub fn placeholder() -> ContextStatus {
    ContextStatus::default()
}

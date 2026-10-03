//! Discover/spawn any CLI. Capabilities are unknown until an adapter claims them.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ToolCapabilities {
    pub context_limit: Capability,
    pub context_usage: Capability,
    pub warning_detection: Capability,
    pub skip_permissions: Capability,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Capability {
    Known,
    Unknown,
}

impl Default for ToolCapabilities {
    fn default() -> Self {
        Self {
            context_limit: Capability::Unknown,
            context_usage: Capability::Unknown,
            warning_detection: Capability::Unknown,
            skip_permissions: Capability::Unknown,
        }
    }
}

pub fn unknown_by_default() -> ToolCapabilities {
    ToolCapabilities::default()
}

use std::path::Path;
use std::fs;
use regex::Regex;
use crate::types::McpServer;

pub struct McpService;

impl McpService {
    pub fn new() -> Self {
        McpService
    }

    pub fn list(&self, installed_commands: &[String], project_path: Option<&str>) -> Vec<McpServer> {
        let mut seen = std::collections::HashSet::new();
        let mut servers = Vec::new();
        let home = dirs::home_dir().unwrap_or_default();

        let global_sources: Vec<(String, &str, Option<&str>)> = vec![
            (home.join(".claude/settings.json").to_string_lossy().to_string(), "Claude Code", Some("claude")),
            (home.join(".config/opencode/opencode.jsonc").to_string_lossy().to_string(), "OpenCode", Some("opencode")),
            (home.join(".codex/config.toml").to_string_lossy().to_string(), "Codex", Some("codex")),
            (home.join(".kiro/settings/mcp.json").to_string_lossy().to_string(), "Kiro", Some("kiro-cli")),
            (home.join(".lmstudio/mcp.json").to_string_lossy().to_string(), "LM Studio", None),
            (home.join(".ai/mcp/mcp.json").to_string_lossy().to_string(), "AI Tools", None),
        ];

        for (fp, label, cmd) in &global_sources {
            if let Some(c) = cmd {
                if !installed_commands.contains(&c.to_string()) { continue; }
            }
            let names = self.read_server_names(fp, "json");
            for n in names {
                if seen.insert(n.clone()) {
                    servers.push(McpServer {
                        name: n,
                        status: "unknown".to_string(),
                        detail: format!("from {}", label),
                        source: Some(label.to_string()),
                    });
                }
            }
        }

        if let Some(pp) = project_path {
            let base = Path::new(pp);
            let project_sources: Vec<(String, &str, Option<&str>)> = vec![
                (base.join(".claude/settings.json").to_string_lossy().to_string(), "Claude Code (project)", Some("claude")),
                (base.join(".mcp.json").to_string_lossy().to_string(), "Project MCP", None),
            ];
            for (fp, label, cmd) in &project_sources {
                if let Some(c) = cmd {
                    if !installed_commands.contains(&c.to_string()) { continue; }
                }
                let names = self.read_server_names(fp, "json");
                for n in names {
                    if seen.insert(n.clone()) {
                        servers.push(McpServer {
                            name: n,
                            status: "unknown".to_string(),
                            detail: format!("from {}", label),
                            source: Some(label.to_string()),
                        });
                    }
                }
            }
        }

        servers
    }

    fn read_server_names(&self, file_path: &str, format: &str) -> Vec<String> {
        let raw = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => return vec![],
        };
        if raw.trim().is_empty() { return vec![]; }

        let cleaned = if format == "jsonc" {
            strip_jsonc(&raw)
        } else {
            raw.clone()
        };

        if format == "toml" {
            return self.parse_toml_mcp_servers(&cleaned);
        }

        let parsed: serde_json::Value = match serde_json::from_str(&cleaned) {
            Ok(v) => v,
            Err(_) => return vec![],
        };
        let mcp_servers = match parsed.get("mcpServers") {
            Some(v) if v.is_object() => v,
            _ => return vec![],
        };
        mcp_servers.as_object().unwrap().keys().cloned().collect()
    }

    fn parse_toml_mcp_servers(&self, content: &str) -> Vec<String> {
        let re = Regex::new(r"^\[mcp_servers\.([^\]]+)\]$").unwrap();
        re.captures_iter(content)
            .map(|cap| cap[1].trim().to_string())
            .filter(|n| !n.is_empty())
            .collect()
    }
}

fn strip_jsonc(text: &str) -> String {
    let re1 = Regex::new(r"//.*$").unwrap();
    let re2 = Regex::new(r"/\*[\s\S]*?\*/").unwrap();
    let re3 = Regex::new(r",\s*([}\]])").unwrap();
    let text = re1.replace_all(text, "");
    let text = re2.replace_all(&text, "");
    re3.replace_all(&text, "$1").to_string()
}

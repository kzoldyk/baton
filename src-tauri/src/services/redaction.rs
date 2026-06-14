use regex::Regex;

pub fn redact_secrets(value: &str) -> String {
    let patterns: Vec<(Regex, fn(&str) -> String)> = vec![
        (
            Regex::new(r"(?i)((?:API_KEY|SECRET|TOKEN|DATABASE_URL|PASSWORD|PRIVATE_KEY|GH_TOKEN|GITHUB_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|HF_TOKEN|NPM_TOKEN|PAT|DEPLOY_KEY)\s*=\s*)[^\s\n\r]+").unwrap(),
            |m: &str| {
                if let Some(pos) = m.find('=') {
                    format!("{}REDACTED", &m[..=pos])
                } else {
                    m.to_string()
                }
            },
        ),
        (
            Regex::new(r#"(?i)((?:apiKey|secret|token|password|privateKey)["']?\s*[:=]\s*["'])[^"'\n\r]+(["'])"#).unwrap(),
            |m: &str| {
                let caps = Regex::new(r#"((?:apiKey|secret|token|password|privateKey)["']?\s*[:=]\s*["'])[^"'\n\r]+(["'])"#).unwrap();
                if let Some(c) = caps.captures(m) {
                    format!("{}REDACTED{}", &c[1], &c[2])
                } else {
                    m.to_string()
                }
            },
        ),
        (
            Regex::new(r"(ghp_|gho_|ghu_|ghs_|ghr_)[\w-]{36,}").unwrap(),
            |m: &str| if m.len() > 20 { "REDACTED_TOKEN".to_string() } else { m.to_string() },
        ),
        (
            Regex::new(r"\b(sk-[a-zA-Z0-9]{20,})\b").unwrap(),
            |_| "REDACTED_API_KEY".to_string(),
        ),
        (
            Regex::new(r"-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----").unwrap(),
            |_| "REDACTED_PRIVATE_KEY".to_string(),
        ),
        (
            Regex::new(r"-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----").unwrap(),
            |_| "REDACTED_PRIVATE_KEY".to_string(),
        ),
    ];

    let mut result = value.to_string();
    for (re, replace) in &patterns {
        result = re.replace_all(&result, |caps: &regex::Captures| {
            replace(&caps[0])
        }).to_string();
    }
    result
}

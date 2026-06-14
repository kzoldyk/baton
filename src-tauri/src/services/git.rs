use std::process::Command;
use crate::types::{ChangedFile, GitStatus};

#[derive(Clone)]
pub struct GitService;

impl GitService {
    pub fn new() -> Self {
        GitService
    }

    pub fn status(&self, project_path: &str) -> GitStatus {
        let is_repo = Self::git(project_path, &["rev-parse", "--is-inside-work-tree"])
            .map(|s| s.trim() == "true")
            .unwrap_or(false);

        if !is_repo {
            return GitStatus {
                is_repo: false,
                branch: String::new(),
                status_short: String::new(),
                diff_stat: String::new(),
                staged_diff_stat: None,
                name_status: String::new(),
                staged_name_status: None,
                changed_files: vec![],
                additions: 0,
                deletions: 0,
            };
        }

        let branch = Self::git(project_path, &["branch", "--show-current"]).unwrap_or_default();
        let status_short = Self::git(project_path, &["status", "--short"]).unwrap_or_default();
        let diff_stat = Self::git(project_path, &["diff", "--stat"]).unwrap_or_default();
        let staged_diff_stat = Self::git(project_path, &["diff", "--cached", "--stat"]).ok();
        let name_status = Self::git(project_path, &["diff", "--name-status"]).unwrap_or_default();
        let staged_name_status = Self::git(project_path, &["diff", "--cached", "--name-status"]).ok();
        let numstat = Self::git(project_path, &["diff", "--numstat"]).unwrap_or_default();

        let changed_files = parse_changed_files(&status_short, &numstat);
        let totals = changed_files.iter().fold((0, 0), |(a, d), f| (a + f.additions, d + f.deletions));

        GitStatus {
            is_repo: true,
            branch: branch.trim().to_string(),
            status_short,
            diff_stat,
            staged_diff_stat,
            name_status,
            staged_name_status,
            changed_files,
            additions: totals.0,
            deletions: totals.1,
        }
    }

    fn git(project_path: &str, args: &[&str]) -> Result<String, String> {
        Command::new("git")
            .args(args)
            .current_dir(project_path)
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim_end().to_string())
            .map_err(|e| e.to_string())
    }
}

fn parse_changed_files(status_short: &str, numstat: &str) -> Vec<ChangedFile> {
    let mut counts: std::collections::HashMap<String, (i32, i32)> = std::collections::HashMap::new();
    for line in numstat.lines().filter(|l| !l.is_empty()) {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let file = parts[parts.len() - 1].to_string();
            let add = parts[0].parse().unwrap_or(0);
            let del = parts[1].parse().unwrap_or(0);
            counts.insert(file, (add, del));
        }
    }

    status_short
        .lines()
        .filter(|l| !l.is_empty())
        .map(|line| {
            let code = &line[..2];
            let file = line[3..].trim().to_string();
            let stats = counts.get(&file).copied().unwrap_or((0, 0));
            ChangedFile {
                path: file,
                additions: stats.0,
                deletions: stats.1,
                status: map_status(code),
            }
        })
        .collect()
}

fn map_status(code: &str) -> String {
    if code.contains('?') { "untracked" }
    else if code.contains('A') { "added" }
    else if code.contains('D') { "deleted" }
    else if code.contains('R') { "renamed" }
    else { "modified" }
    .to_string()
}

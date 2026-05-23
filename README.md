# Baton

Pass context between coding agents. A desktop app for seamless handoffs between AI coding agents like Codex, Claude Code, OpenCode, Gemini CLI, and Kiro.

## Usage

```bash
npm run dev     # development
npm run build   # typecheck + build
npm run dist    # package for distribution
```

## How it works

1. **Add a project** — Baton creates a `.baton/` bridge directory in it
2. **Run an agent** — launches in a PTY terminal with context from the project
3. **Create a Baton Pass** — captures git diff, task state, and decisions as a structured handoff document
4. **Switch agents** — the next agent reads the handoff and continues seamlessly

Sessions persist across app restarts via SQLite. Each session can be renamed or deleted from the sidebar.

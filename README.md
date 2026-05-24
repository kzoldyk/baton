# Baton

> Pass context between AI coding agents — seamlessly switch between Codex, Claude Code, OpenCode, Gemini CLI, Kiro, and more.

<p align="center">
  <a href="https://batonai.pages.dev/">
    <img src="build/screenshot.png" alt="Baton" width="800" />
  </a>
</p>

<p align="center">
  <a href="https://batonai.pages.dev/">batonai.pages.dev</a>
</p>

Baton is a desktop app that lets you hand off work between AI coding agents without losing context. It creates a structured **Baton Pass** — a markdown document capturing git diff, task state, decisions, and next steps — so the next agent picks up exactly where the last one left off.

## How it works

1. **Add a project** — Baton creates a `.baton/` bridge directory in it
2. **Run an agent** — launches in a PTY terminal with context from the project
3. **Create a Baton Pass** — captures git diff, task state, and decisions as a structured handoff document
4. **Switch agents** — the next agent reads the handoff and continues seamlessly

Sessions persist across app restarts via SQLite. Each session can be renamed or deleted from the sidebar.

## Roadmap

| Phase | What |
|-------|------|
| **v1** (current) | **File-based handoff** — agents exchange context via `.baton/latest-handoff.md` in the project directory |
| **v2** (next) | **Shared context memory layer** — persistent memory that agents can read/write to across sessions, beyond a single handoff file |
| **v3** (future) | **Multi-agent teams** — one "brain" agent orchestrates specialists (engineer, designer, tester). Users assemble their own team — for example, Codex as the brain, Claude as the designer, OpenCode as the engineer, Gemini as the tester. Build your own **Avengers**. |

## Usage

```bash
npm run dev       # development
npm run build     # typecheck + build
npm run dist      # package for distribution
```

## Supported agents

- **Codex** — `codex`
- **Claude Code** — `claude`
- **OpenCode** — `opencode`
- **Gemini CLI** — `gemini`
- **Kiro CLI** — `kiro-cli`

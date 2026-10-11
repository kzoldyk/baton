# Changelog

All notable changes to **Baton** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-10-11

### Highlights
- **macOS Native Glass Overhaul**: Under-window translucency and vibrancy conforming to macOS Sonoma and Sequoia guidelines.
- **Preemptive Token Exhaustion Alerts**: Monitors token count and terminal output to warn you before context limits are hit, providing a 1-click rescue handoff.
- **Cute Worker Session Names**: Automatically names agent sessions with friendly nicknames (Mochi, Pixel, Boba) with double-click inline renaming.
- **Custom Agent Brand Logos**: Crisp SVG/PNG brand identities for Google Antigravity (AGY), Kiro, Claude, Gemini, Cursor, and Terminal.
- **In-App Update Checker & Release Notes**: Automatic background check against GitHub Releases with 1-click DMG download and release dialog.
- **Zero-Dependency Native Haptics**: Subtle physical audio-haptic feedback on clicks, tabs, and project selection using the Web Audio API.
- **Ultra-Lean App Footprint**: Eliminated 508 redundant dependencies, reducing bundle size by over 3 MB.

### Added
- **GitHub Multi-Platform Release Workflow**: Automated CI pipeline to build and publish release artifacts for macOS (`.dmg`, `.zip`), Linux (`.AppImage`, `.deb`), and Windows (`.exe`).
- **Live Context & Token Tracking**: Real-time evaluation of terminal session buffer bytes (~4 chars/token) with distinct warning (55k tokens) and critical (90k tokens) thresholds.
- **Prompt Injection for Handoff Capture**: Direct injection of handoff generation instructions into active CLI agents.
- **Interactive "What's New" Dialog**: Built-in release notes modal accessible from the sidebar version badge, settings, or automatically upon updating.
- **Bundled Portable tmux**: Pre-compiled static tmux binaries for macOS Apple Silicon (`darwin-arm64`) and Linux (`linux-x64`) so no manual `brew install tmux` is required.
- **Session Segment Tabs**: Compact macOS-style segmented session navigation with live status dots (running, completed, failed).

### Changed
- Refactored Electron main window configuration for frameless `hiddenInset` title bar with native traffic light positioning (`x: 18, y: 16`).
- Standardized Apple SF Pro system font stack and 1.5px SF Symbol icon stroke weights across all UI components.
- Upgraded pass file YAML serializer with bullet list caps and markdown parsing.

### Fixed
- Fixed tmux mouse-drag selection interception so native terminal copy/paste (`⌘C` / `⌘V`) works seamlessly.
- Prevented duplicate terminal event listeners when switching between active and split sessions.
- Resolved draggable titlebar regions blocking click events on window controls and action buttons.
- Fixed non-git project detection to fail gracefully with `isRepo: false` instead of throwing unhandled exceptions.

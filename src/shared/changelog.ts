export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  features: string[];
  improvements: string[];
  fixes: string[];
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  htmlUrl?: string;
  downloadUrl?: string;
  publishedAt?: string;
  checkedAt: string;
}

/**
 * Standard semver comparator (handles optional 'v' prefix and prerelease tags).
 * Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if a === b
 */
export function compareSemver(a: string, b: string): number {
  const clean = (v: string) => v.trim().replace(/^v/i, "").split("-")[0];
  const partsA = clean(a).split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = clean(b).split(".").map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Built-in changelog entries shown inside the app and offline.
 */
export const BUNDLED_CHANGELOG: ReleaseEntry[] = [
  {
    version: "0.1.0",
    date: "October 2026",
    title: "macOS Native Overhaul & Preemptive Token Alerts",
    highlights: [
      "Full macOS Sonoma/Sequoia liquid glass vibrancy with transparent background",
      "Preemptive token exhaustion alert with 1-click rescue handoff",
      "Cute worker agent names with inline rename and custom brand logos",
      "Zero-dependency Web Audio haptic click feedback",
      "3 MB app size reduction and 508 redundant dependencies eliminated"
    ],
    features: [
      "Live token & context monitoring: warns before agents exhaust quota so handoff can be saved",
      "1-click handoff capture prompt injection into live agent terminals",
      "Cute worker names (Mochi, Pixel, Boba) with double-click inline renaming",
      "Custom brand logos for Google Antigravity (AGY), Kiro, Claude, Gemini, Cursor, and Terminal",
      "Segmented macOS session tabs with status indicators"
    ],
    improvements: [
      "Native macOS window vibrancy (under-window) and exact traffic light spacing",
      "Apple SF Pro typography hierarchy and 1.5px SF Symbol icon strokes",
      "Bundled portable tmux binaries for Apple Silicon (arm64) and Linux (x64)",
      "Instant copy & paste keyboard shortcut support across all terminal panes"
    ],
    fixes: [
      "Fixed tmux copy bug where text selection was intercepted by mouse-drag mode",
      "Prevented false positive token errors and duplicate session terminal listeners",
      "Fixed window drag regions so top title bar can be dragged without blocking buttons"
    ]
  }
];

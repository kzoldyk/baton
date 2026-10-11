import { compareSemver, type UpdateCheckResult } from "../../shared/changelog.ts";

export class UpdateService {
  private readonly repo: string;
  private readonly currentVersion: string;
  private readonly openExternalFn?: (url: string) => Promise<unknown>;

  constructor(
    repo = "kzoldyk/baton",
    currentVersion = "0.1.0",
    openExternalFn?: (url: string) => Promise<unknown>
  ) {
    this.repo = repo;
    this.currentVersion = currentVersion;
    this.openExternalFn = openExternalFn;
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch(`https://api.github.com/repos/${this.repo}/releases/latest`, {
        headers: {
          "User-Agent": "BatonApp",
          Accept: "application/vnd.github.v3+json"
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return {
          currentVersion: this.currentVersion,
          latestVersion: this.currentVersion,
          updateAvailable: false,
          checkedAt
        };
      }

      const data = await response.json() as {
        tag_name?: string;
        body?: string;
        html_url?: string;
        published_at?: string;
        assets?: Array<{ name: string; browser_download_url: string }>;
      };

      const tag = data.tag_name ?? this.currentVersion;
      const latestVersion = tag.replace(/^v/i, "");
      const updateAvailable = compareSemver(latestVersion, this.currentVersion) > 0;

      // Find macOS DMG asset if available, otherwise fallback to release page
      const dmgAsset = data.assets?.find((a) => a.name.endsWith(".dmg"))?.browser_download_url;

      return {
        currentVersion: this.currentVersion,
        latestVersion,
        updateAvailable,
        releaseNotes: data.body,
        htmlUrl: data.html_url,
        downloadUrl: dmgAsset ?? data.html_url,
        publishedAt: data.published_at,
        checkedAt
      };
    } catch {
      return {
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        updateAvailable: false,
        checkedAt
      };
    }
  }

  async openExternalUrl(targetUrl: string): Promise<boolean> {
    if (!targetUrl || typeof targetUrl !== "string") return false;
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        if (this.openExternalFn) {
          await this.openExternalFn(targetUrl);
          return true;
        }
        const electron = await import("electron");
        await (electron.shell ?? electron.default?.shell)?.openExternal(targetUrl);
        return true;
      }
    } catch {
      // Invalid URL
    }
    return false;
  }
}

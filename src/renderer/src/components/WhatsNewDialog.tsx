import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useAppStore } from "../store/useAppStore";
import { BUNDLED_CHANGELOG } from "../../../shared/changelog";
import { BatonLogo } from "./BatonLogo";
import { hapticTap } from "../lib/macHaptics";
import {
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  Wrench,
  CheckCircle2,
  ArrowUpCircle
} from "lucide-react";

export function WhatsNewDialog(): JSX.Element {
  const { whatsNewOpen, setWhatsNewOpen, updateInfo, checkingUpdates, checkForUpdates } = useAppStore();
  const [downloading, setDownloading] = useState(false);

  const isUpdateAvailable = Boolean(updateInfo?.updateAvailable);
  const currentVersion = updateInfo?.currentVersion || "0.1.0";
  const latestVersion = updateInfo?.latestVersion || currentVersion;

  const handleDownload = async () => {
    if (!updateInfo?.downloadUrl) return;
    hapticTap();
    setDownloading(true);
    await window.baton.updates.openUrl(updateInfo.downloadUrl);
    setDownloading(false);
  };

  const handleOpenReleasePage = async () => {
    if (!updateInfo?.htmlUrl) return;
    hapticTap();
    await window.baton.updates.openUrl(updateInfo.htmlUrl);
  };

  const handleCheckAgain = async () => {
    hapticTap();
    await checkForUpdates(true);
  };

  return (
    <Dialog open={whatsNewOpen} onOpenChange={setWhatsNewOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden mac-glass-card border-white/10 bg-zinc-950/90 text-zinc-100 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 space-y-2">
          <div className="flex items-center gap-3">
            <BatonLogo size={30} className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight text-zinc-100">
                  What's New in Baton
                </DialogTitle>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium">
                  v{currentVersion}
                </span>
              </div>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Release notes, new capabilities, and continuous improvements
              </DialogDescription>
            </div>
          </div>

          {/* Update Available Banner */}
          {isUpdateAvailable ? (
            <div className="mt-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <ArrowUpCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-300">
                    Baton v{latestVersion} is available!
                  </div>
                  <div className="text-[11px] text-emerald-400/80">
                    A newer release is ready with latest updates and bug fixes.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-7 px-3 shadow"
                  onClick={() => void handleDownload()}
                  disabled={downloading}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {downloading ? "Opening..." : "Download Update (.dmg)"}
                </Button>
                {updateInfo?.htmlUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs h-7 px-2"
                    onClick={() => void handleOpenReleasePage()}
                    title="View GitHub Release"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>You are running the latest version of Baton (v{currentVersion}).</span>
              </div>
              <button
                onClick={() => void handleCheckAgain()}
                disabled={checkingUpdates}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${checkingUpdates ? "animate-spin" : ""}`} />
                <span>{checkingUpdates ? "Checking..." : "Check again"}</span>
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Changelog Content */}
        <ScrollArea className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6 pb-4">
            {BUNDLED_CHANGELOG.map((entry) => (
              <div key={entry.version} className="space-y-3.5">
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100 font-mono">
                      v{entry.version}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      — {entry.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {entry.date}
                  </span>
                </div>

                {/* Highlights */}
                {entry.highlights && entry.highlights.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Release Highlights</span>
                    </div>
                    <ul className="space-y-1.5">
                      {entry.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-200 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Features */}
                {entry.features && entry.features.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      <Zap className="h-3 w-3 text-amber-400" />
                      <span>New Features</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {entry.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                          <span className="h-1 w-1 rounded-full bg-zinc-600 shrink-0 mt-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {entry.improvements && entry.improvements.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                      <span>Improvements</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {entry.improvements.map((improvement, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                          <span className="h-1 w-1 rounded-full bg-zinc-600 shrink-0 mt-2" />
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bug Fixes */}
                {entry.fixes && entry.fixes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      <Wrench className="h-3 w-3 text-emerald-400" />
                      <span>Bug Fixes</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {entry.fixes.map((fix, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                          <span className="h-1 w-1 rounded-full bg-zinc-600 shrink-0 mt-2" />
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/60 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            Baton • Local-First Agent Handoff
          </div>
          <div className="flex items-center gap-2">
            {isUpdateAvailable && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 px-3"
                onClick={() => void handleDownload()}
                disabled={downloading}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {downloading ? "Opening..." : "Download v" + latestVersion}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-white/10 text-zinc-300 hover:bg-white/5"
              onClick={() => {
                hapticTap();
                setWhatsNewOpen(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

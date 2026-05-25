import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import type { Theme } from "../store/useAppStore";
import { useAppStore } from "../store/useAppStore";

function terminalTheme(theme: Theme) {
  return theme === "dark" ? {
    background: "#09090b", foreground: "#e4e4e7", cursor: "#f4f4f5",
    black: "#18181b", red: "#f87171", green: "#34d399", yellow: "#fbbf24",
    blue: "#60a5fa", magenta: "#c084fc", cyan: "#22d3ee", white: "#f4f4f5"
  } : {
    background: "#fafafa", foreground: "#27272a", cursor: "#18181b",
    black: "#d4d4d8", red: "#dc2626", green: "#16a34a", yellow: "#ca8a04",
    blue: "#2563eb", magenta: "#9333ea", cyan: "#0891b2", white: "#18181b"
  };
}

function SessionTerminal({ sessionId, visible }: { sessionId: string; visible: boolean }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const status = useAppStore((state) => state.sessions.find((s) => s.id === sessionId)?.status);
  const theme = useAppStore((state) => state.theme);
  const isAlive = status === "running" || !status;

  // 1. Initialize terminal once per sessionId
  useEffect(() => {
    if (!ref.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      theme: terminalTheme(theme)
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(ref.current);
    fit.fit();
    
    terminalRef.current = terminal;
    fitRef.current = fit;

    // Initial history load
    void window.baton.sessions.readLog(sessionId).then((log) => {
      if (log) terminal.write(log);
      if (!isAlive && log) {
        terminal.write("\r\n\x1b[2m─── session ended ───\x1b[0m\r\n");
      } else if (isAlive && !log) {
        terminal.write("\x1b[2mBaton terminal attached. Agent process output will appear here.\x1b[0m\r\n");
      }
    });

    const onResize = (): void => {
      fit.fit();
      if (isAlive) window.baton.terminal.resize(sessionId, terminal.cols, terminal.rows);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [sessionId]);

  // 2. Handle theme updates
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = terminalTheme(theme);
    }
  }, [theme]);

  // 3. Handle interactivity and data flow only when alive
  useEffect(() => {
    const terminal = terminalRef.current;
    const fit = fitRef.current;
    if (!terminal || !fit || !isAlive) return;

    terminal.focus();
    
    // Ensure terminal size is synced with backend immediately
    window.setTimeout(() => {
      fit.fit();
      window.baton.terminal.resize(sessionId, terminal.cols, terminal.rows);
    }, 200);

    const disposeData = window.baton.terminal.onData(({ sessionId: sid, data }) => {
      if (sid === sessionId) terminal.write(data);
    });
    
    const disposeExit = window.baton.terminal.onExit(({ sessionId: sid, exitCode }) => {
      if (sid === sessionId) terminal.write(`\r\n\x1b[2mProcess exited with code ${exitCode}.\x1b[0m\r\n`);
    });

    const input = terminal.onData((data) => window.baton.terminal.write(sessionId, data));

    return () => {
      input.dispose();
      disposeData();
      disposeExit();
    };
  }, [sessionId, isAlive]);

  return <div ref={ref} className={visible ? "h-full w-full overflow-hidden bg-zinc-950 p-3" : "hidden"} />;
}

export function TerminalPane(): JSX.Element {
  const sessions = useAppStore((state) => state.sessions);
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const resumeSession = useAppStore((state) => state.resumeSession);
  const setState = useAppStore((state) => state.setState);
  const projectSessions = sessions.filter((s) => s.projectId === selectedProjectId);
  const activeSession = projectSessions.find((s) => s.id === activeSessionId);
  const isAlive = activeSession?.status === "running" || !activeSession?.status;

  // #19 — empty state with action button
  if (!activeSessionId || projectSessions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="text-sm font-medium text-zinc-200">No agent session running.</div>
        <div className="text-sm text-zinc-500">Start an installed coding agent in this project.</div>
        <Button size="sm" onClick={() => setState({ quickLaunchProjectId: selectedProjectId })}>
          Launch Agent
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-0 overflow-hidden bg-zinc-950">
      {projectSessions.map((session) => (
        <SessionTerminal key={session.id} sessionId={session.id} visible={session.id === activeSessionId} />
      ))}
      
      {/* Resume Overlay for ended sessions */}
      {!isAlive && (
        <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pb-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-zinc-500 font-medium">This session has ended.</p>
            <Button 
              size="sm" 
              className="bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg"
              onClick={() => void resumeSession(activeSessionId)}
            >
              <Play className="mr-2 h-3.5 w-3.5" />
              Resume Chat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

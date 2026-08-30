import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { Copy, ClipboardPaste, Play, TextSelect } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import type { Theme } from "../store/useAppStore";
import { useAppStore } from "../store/useAppStore";
import { attachTerminalClipboardAndDrop, bindTerminalKeys } from "../lib/terminalInput";

function terminalTheme(theme: Theme) {
  switch (theme) {
    case "catppuccin":
      return {
        background: "#1e1e2e", foreground: "#cdd6f4", cursor: "#f5e0dc",
        black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
        blue: "#89b4fa", magenta: "#cba6f7", cyan: "#94e2d5", white: "#bac2de"
      };
    case "catppuccin-latte":
      return {
        background: "#eff1f5", foreground: "#4c4f69", cursor: "#dc8a78",
        black: "#5c5f77", red: "#d20f39", green: "#40a02b", yellow: "#df8e1d",
        blue: "#1e66f5", magenta: "#8839ef", cyan: "#179299", white: "#acb0be"
      };
    case "tokyo-night":
      return {
        background: "#1a1b26", foreground: "#c0caf5", cursor: "#c0caf5",
        black: "#15161e", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68",
        blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", white: "#a9b1d6"
      };
    case "dracula":
      return {
        background: "#282a36", foreground: "#f8f8f2", cursor: "#f8f8f2",
        black: "#000000", red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c",
        blue: "#bd93f9", magenta: "#ff79c6", cyan: "#8be9fd", white: "#bfbfbf"
      };
    case "nord":
      return {
        background: "#2e3440", foreground: "#d8dee9", cursor: "#d8dee9",
        black: "#3b4252", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b",
        blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0", white: "#e5e9f0"
      };
    case "one-dark":
      return {
        background: "#21252b", foreground: "#abb2bf", cursor: "#528bff",
        black: "#1e2227", red: "#e06c75", green: "#98c379", yellow: "#e5c07b",
        blue: "#61afef", magenta: "#c678dd", cyan: "#56b6c2", white: "#abb2bf"
      };
    case "light":
      return {
        background: "#fafafa", foreground: "#27272a", cursor: "#18181b",
        black: "#d4d4d8", red: "#dc2626", green: "#16a34a", yellow: "#ca8a04",
        blue: "#2563eb", magenta: "#9333ea", cyan: "#0891b2", white: "#18181b"
      };
    case "dark":
    default:
      return {
        background: "#09090b", foreground: "#e4e4e7", cursor: "#f4f4f5",
        black: "#18181b", red: "#f87171", green: "#34d399", yellow: "#fbbf24",
        blue: "#60a5fa", magenta: "#c084fc", cyan: "#22d3ee", white: "#f4f4f5"
      };
  }
}

type ContextMenuState = { x: number; y: number };

function TerminalContextMenu({
  point,
  onCopy,
  onPaste,
  onSelectAll,
  onClose
}: {
  point: ContextMenuState;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onClose: () => void;
}): JSX.Element | null {
  if (point.x < 0) return null;
  return (
    <div
      className="fixed z-[200] min-w-[168px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ left: point.x, top: point.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <MenuItem icon={Copy} label="Copy" hint="⌘C" onClick={() => { onCopy(); onClose(); }} />
      <MenuItem icon={ClipboardPaste} label="Paste" hint="⌘V" onClick={() => { void onPaste(); onClose(); }} />
      <MenuItem icon={TextSelect} label="Select all" onClick={() => { onSelectAll(); onClose(); }} />
    </div>
  );
}

function MenuItem({ icon: Icon, label, hint, onClick }: { icon: typeof Copy; label: string; hint?: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span className="flex-1">{label}</span>
      {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

function SessionTerminal({ sessionId, visible }: { sessionId: string; visible: boolean }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [menu, setMenu] = useState<ContextMenuState>({ x: -1, y: -1 });
  const status = useAppStore((state) => state.sessions.find((s) => s.id === sessionId)?.status);
  const theme = useAppStore((state) => state.theme);
  const isAlive = status === "running" || !status;

  useEffect(() => {
    if (!ref.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      theme: terminalTheme(theme),
      scrollback: 5000,
      allowProposedApi: true
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(ref.current);
    fit.fit();

    terminalRef.current = terminal;
    fitRef.current = fit;

    void window.baton.sessions.readLog(sessionId).then((log) => {
      if (log) terminal.write(log);
      if (!isAlive && log) {
        terminal.write("\r\n\x1b[2m─── session ended ───\x1b[0m\r\n");
      } else if (isAlive && !log) {
        terminal.write("\x1b[2mBaton terminal attached. ⌘C copy · ⌘V paste · drop files or images.\x1b[0m\r\n");
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

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = terminalTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    const terminal = terminalRef.current;
    const fit = fitRef.current;
    const container = ref.current;
    if (!terminal || !fit || !container || !isAlive) return;

    terminal.focus();

    window.setTimeout(() => {
      fit.fit();
      window.baton.terminal.resize(sessionId, terminal.cols, terminal.rows);
    }, 200);

    const send = (data: string): void => {
      window.baton.terminal.write(sessionId, data);
    };

    const disposeKeys = bindTerminalKeys(terminal, send);
    const disposeClipboard = attachTerminalClipboardAndDrop({
      container,
      sessionId,
      write: window.baton.terminal.write,
      isAlive: () => isAlive,
      onContextMenu: setMenu
    });

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
      disposeKeys();
      disposeClipboard();
    };
  }, [sessionId, isAlive]);

  const copySelection = (): void => {
    const terminal = terminalRef.current;
    if (!terminal?.hasSelection()) return;
    void navigator.clipboard.writeText(terminal.getSelection()).catch(() => undefined);
  };

  const pasteClipboard = async (): Promise<void> => {
    if (!isAlive) return;
    const text = await navigator.clipboard.readText();
    if (text) window.baton.terminal.write(sessionId, text);
  };

  return (
    <>
      <div
        ref={ref}
        className={visible ? "h-full w-full overflow-hidden bg-zinc-950 p-3 [&_.xterm]:h-full" : "hidden"}
        onClick={() => setMenu({ x: -1, y: -1 })}
      />
      {visible ? (
        <TerminalContextMenu
          point={menu}
          onCopy={copySelection}
          onPaste={pasteClipboard}
          onSelectAll={() => terminalRef.current?.selectAll()}
          onClose={() => setMenu({ x: -1, y: -1 })}
        />
      ) : null}
    </>
  );
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

      {!isAlive ? (
        <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-center bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pb-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-zinc-500">This session has ended.</p>
            <Button
              size="sm"
              className="bg-orange-600 text-white hover:bg-orange-500 shadow-lg"
              onClick={() => void resumeSession(activeSessionId)}
            >
              <Play className="mr-2 h-3.5 w-3.5" />
              Resume Chat
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

function SessionTerminal({ sessionId, visible }: { sessionId: string; visible: boolean }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const status = useAppStore((state) => state.sessions.find((s) => s.id === sessionId)?.status);
  const isAlive = status === "running" || !status;

  useEffect(() => {
    if (!ref.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#f4f4f5",
        black: "#18181b",
        red: "#f87171",
        green: "#34d399",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#f4f4f5"
      }
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(ref.current);
    fit.fit();
    terminal.focus();

    if (!isAlive) {
      terminal.write("\x1b[2mThis session has ended.\x1b[0m\r\n");
      return () => { terminal.dispose(); };
    }

    terminal.write("\x1b[2mBaton terminal attached. Agent process output will appear here.\x1b[0m\r\n");
    const disposeData = window.baton.terminal.onData(({ sessionId: sid, data }) => {
      if (sid === sessionId) terminal.write(data);
    });
    const disposeExit = window.baton.terminal.onExit(({ sessionId: sid, exitCode }) => {
      if (sid === sessionId) terminal.write(`\r\n\x1b[2mProcess exited with code ${exitCode}.\x1b[0m\r\n`);
    });
    const input = terminal.onData((data) => window.baton.terminal.write(sessionId, data));
    const onResize = (): void => {
      fit.fit();
      window.baton.terminal.resize(sessionId, terminal.cols, terminal.rows);
    };
    window.addEventListener("resize", onResize);
    window.setTimeout(onResize, 100);
    return () => {
      window.removeEventListener("resize", onResize);
      input.dispose();
      disposeData();
      disposeExit();
      terminal.dispose();
    };
  }, [sessionId, isAlive]);

  return <div ref={ref} className={visible ? "h-full w-full overflow-hidden bg-zinc-950 p-3" : "hidden"} />;
}

export function TerminalPane(): JSX.Element {
  const sessions = useAppStore((state) => state.sessions);
  const selectedProjectId = useAppStore((state) => state.selectedProjectId);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const projectSessions = sessions.filter((s) => s.projectId === selectedProjectId);

  if (!activeSessionId || projectSessions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <div className="text-sm font-medium text-zinc-200">No agent session running.</div>
          <div className="mt-1 text-sm text-zinc-500">Start an installed coding agent in this project.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-0">
      {projectSessions.map((session) => (
        <SessionTerminal key={session.id} sessionId={session.id} visible={session.id === activeSessionId} />
      ))}
    </div>
  );
}

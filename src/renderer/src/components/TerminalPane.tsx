import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export function TerminalPane(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal>();
  const fitRef = useRef<FitAddon>();
  const activeSessionId = useAppStore((state) => state.activeSessionId);

  useEffect(() => {
    if (!ref.current || !activeSessionId) return;
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
    terminal.write("\x1b[2mBaton terminal attached. Agent process output will appear here.\x1b[0m\r\n");
    const disposeData = window.baton.terminal.onData(({ sessionId, data }) => {
      if (sessionId === activeSessionId) terminal.write(data);
    });
    const disposeExit = window.baton.terminal.onExit(({ sessionId, exitCode }) => {
      if (sessionId === activeSessionId) terminal.write(`\r\n\x1b[2mProcess exited with code ${exitCode}.\x1b[0m\r\n`);
    });
    const input = terminal.onData((data) => window.baton.terminal.write(activeSessionId, data));
    const onResize = (): void => {
      fit.fit();
      window.baton.terminal.resize(activeSessionId, terminal.cols, terminal.rows);
    };
    window.addEventListener("resize", onResize);
    terminalRef.current = terminal;
    fitRef.current = fit;
    window.setTimeout(onResize, 100);
    return () => {
      window.removeEventListener("resize", onResize);
      input.dispose();
      disposeData();
      disposeExit();
      terminal.dispose();
    };
  }, [activeSessionId]);

  if (!activeSessionId) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <div className="text-sm font-medium text-zinc-200">No agent session running.</div>
          <div className="mt-1 text-sm text-zinc-500">Start an installed coding agent in this project.</div>
        </div>
      </div>
    );
  }

  return <div ref={ref} className="h-full w-full overflow-hidden bg-zinc-950 p-3" />;
}

/** Resolve dropped files to paths agents can read (Electron adds `.path`). */
export function pathsFromFileList(files: FileList | File[]): string {
  return Array.from(files)
    .map((file) => {
      const raw = (file as File & { path?: string }).path?.trim() || file.name.trim();
      if (!raw) return "";
      return raw.includes(" ") ? `"${raw}"` : raw;
    })
    .filter(Boolean)
    .join(" ");
}

export function textFromDataTransfer(dataTransfer: DataTransfer): string | undefined {
  if (dataTransfer.files?.length) {
    const paths = pathsFromFileList(dataTransfer.files);
    if (paths) return paths;
  }
  const text = dataTransfer.getData("text/plain")?.replace(/\r\n/g, "\n").trim();
  return text || undefined;
}

export function shouldCopySelection(event: KeyboardEvent, hasSelection: boolean): boolean {
  if (!hasSelection) return false;
  const key = event.key.toLowerCase();
  if (event.metaKey && key === "c") return true;
  if (event.ctrlKey && event.shiftKey && key === "c") return true;
  return false;
}

export function shouldPaste(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  if (event.metaKey && key === "v") return true;
  if (event.ctrlKey && event.shiftKey && key === "v") return true;
  if (event.ctrlKey && !event.shiftKey && key === "v") return true;
  return false;
}

export type TerminalWrite = (sessionId: string, data: string) => void;

export function copyToClipboard(text: string): void {
  if (!text) return;
  if (typeof window !== "undefined" && window.baton?.clipboard?.writeText) {
    window.baton.clipboard.writeText(text);
  } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => undefined);
  }
}

export async function readFromClipboard(): Promise<string> {
  if (typeof window !== "undefined" && window.baton?.clipboard?.readText) {
    return window.baton.clipboard.readText() || "";
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    return (await navigator.clipboard.readText().catch(() => "")) || "";
  }
  return "";
}

export function bindTerminalKeys(
  terminal: {
    attachCustomKeyEventHandler: (handler: (event: KeyboardEvent) => boolean) => void;
    hasSelection: () => boolean;
    getSelection: () => string;
  },
  send: (data: string) => void
): () => void {
  terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
    if (shouldCopySelection(event, terminal.hasSelection())) {
      copyToClipboard(terminal.getSelection());
      return false;
    }
    if (shouldPaste(event)) {
      event.preventDefault();
      void readFromClipboard().then((text) => {
        if (text) send(text);
      });
      return false;
    }
    return true;
  });
  return () => terminal.attachCustomKeyEventHandler(() => true);
}

export function attachTerminalClipboardAndDrop(options: {
  container: HTMLElement;
  sessionId: string;
  write: TerminalWrite;
  isAlive: () => boolean;
  onContextMenu?: (point: { x: number; y: number }) => void;
}): () => void {
  const { container, sessionId, write, isAlive, onContextMenu } = options;

  const send = (data: string): void => {
    if (!isAlive() || !data) return;
    write(sessionId, data);
  };

  const onPaste = (event: ClipboardEvent): void => {
    if (!isAlive()) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain");
    if (text) send(text);
  };

  const onDragOver = (event: DragEvent): void => {
    if (!isAlive()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: DragEvent): void => {
    if (!isAlive() || !event.dataTransfer) return;
    event.preventDefault();
    const text = textFromDataTransfer(event.dataTransfer);
    if (text) send(text);
  };

  const onContextMenuEvent = (event: MouseEvent): void => {
    event.preventDefault();
    onContextMenu?.({ x: event.clientX, y: event.clientY });
  };

  const hideMenu = (): void => onContextMenu?.({ x: -1, y: -1 });

  container.addEventListener("paste", onPaste);
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);
  container.addEventListener("contextmenu", onContextMenuEvent);
  window.addEventListener("click", hideMenu);

  return () => {
    container.removeEventListener("paste", onPaste);
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
    container.removeEventListener("contextmenu", onContextMenuEvent);
    window.removeEventListener("click", hideMenu);
  };
}

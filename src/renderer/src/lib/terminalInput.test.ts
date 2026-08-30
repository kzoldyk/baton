import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathsFromFileList, shouldCopySelection, shouldPaste, textFromDataTransfer } from "./terminalInput.ts";

describe("terminal input", () => {
  it("quotes dropped paths that contain spaces", () => {
    const files = [{ name: "a.png", path: "/tmp/my image.png" }] as File[];
    assert.equal(pathsFromFileList(files), '"/tmp/my image.png"');
  });

  it("joins multiple dropped files", () => {
    const files = [
      { name: "a.png", path: "/tmp/a.png" },
      { name: "b.png", path: "/tmp/b.png" }
    ] as File[];
    assert.equal(pathsFromFileList(files), "/tmp/a.png /tmp/b.png");
  });

  it("prefers file paths from dataTransfer", () => {
    const dt = {
      files: [{ name: "shot.png", path: "/Users/me/shot.png" }],
      getData: () => ""
    } as unknown as DataTransfer;
    assert.equal(textFromDataTransfer(dt), "/Users/me/shot.png");
  });

  it("detects copy and paste shortcuts", () => {
    assert.equal(shouldCopySelection({ metaKey: true, key: "c", ctrlKey: false, shiftKey: false } as KeyboardEvent, true), true);
    assert.equal(shouldCopySelection({ metaKey: true, key: "c", ctrlKey: false, shiftKey: false } as KeyboardEvent, false), false);
    assert.equal(shouldPaste({ metaKey: true, key: "v", ctrlKey: false, shiftKey: false } as KeyboardEvent), true);
    assert.equal(shouldPaste({ ctrlKey: true, shiftKey: true, key: "v", metaKey: false } as KeyboardEvent), true);
  });
});

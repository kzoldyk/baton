import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { useAppStore } from "../store/useAppStore";

export function HandoffPreview(): JSX.Element {
  const { previewOpen, latestHandoff, setState } = useAppStore();

  return (
    <Dialog open={previewOpen} onOpenChange={(open) => setState({ previewOpen: open })}>
      <DialogContent className="h-[78vh]">
        <DialogHeader>
          <DialogTitle>Baton Pass Preview</DialogTitle>
          <DialogDescription>Canonical handoff saved locally and copied to `.baton/latest-handoff.md`.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(78vh-150px)] rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{latestHandoff?.content ?? "No Baton Pass yet."}</pre>
        </ScrollArea>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setState({ previewOpen: false, usePassOpen: true })}>Use Baton Pass</Button>
          <Button onClick={() => void navigator.clipboard.writeText(latestHandoff?.content ?? "")}>Copy Prompt</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

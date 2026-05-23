import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";

export function HandoffPromptDialog(): JSX.Element {
  const { handoffPrompt, agents, injectHandoffForSession, skipHandoffForSession } = useAppStore();
  const agent = agents.find((a) => a.id === handoffPrompt?.agentId);

  return (
    <Dialog open={!!handoffPrompt} onOpenChange={(open) => { if (!open) skipHandoffForSession(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Use Baton Pass?</DialogTitle>
          <DialogDescription>
            A handoff from a previous agent session was detected. Inject it into the new {agent?.displayName ?? ""} session?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => skipHandoffForSession()}>Skip</Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => handoffPrompt && void injectHandoffForSession(handoffPrompt.sessionId)}
          >
            Use Handoff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

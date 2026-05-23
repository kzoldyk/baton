import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";

export function HandoffPromptDialog(): JSX.Element {
  const { handoffPromptOpen, pendingHandoffAgentId, latestHandoff, injectHandoffForSession, setState } = useAppStore();

  const agentName = pendingHandoffAgentId
    ? { codex: "Codex", claude: "Claude Code", opencode: "OpenCode", gemini: "Gemini CLI", kiro: "Kiro" }[pendingHandoffAgentId]
    : "the agent";

  return (
    <Dialog open={handoffPromptOpen} onOpenChange={(open) => {
      if (!open) setState({ handoffPromptOpen: false, pendingHandoffSessionId: undefined, pendingHandoffAgentId: undefined });
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Handoff Found</DialogTitle>
          <DialogDescription>
            A Baton Pass handoff exists for this project.
            {latestHandoff?.summary ? <span className="mt-2 block text-zinc-400">"{latestHandoff.summary}"</span> : null}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-zinc-300">
          Would you like to inject the handoff into <span className="font-medium text-zinc-100">{agentName}</span>?
          The agent will read the task context and continue from where you left off.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setState({ handoffPromptOpen: false, pendingHandoffSessionId: undefined, pendingHandoffAgentId: undefined })}>
            Skip
          </Button>
          <Button onClick={() => void injectHandoffForSession()}>
            Use Handoff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

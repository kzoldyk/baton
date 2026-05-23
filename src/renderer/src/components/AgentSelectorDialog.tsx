import type { AgentId } from "../../../shared/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { useAppStore } from "../store/useAppStore";

export function AgentSelectorDialog(): JSX.Element {
  const { usePassOpen, agents, runAgent, setState } = useAppStore();

  const continueWith = async (agentId: AgentId): Promise<void> => {
    await runAgent(agentId, true);
    setState({ usePassOpen: false });
  };

  return (
    <Dialog open={usePassOpen} onOpenChange={(open) => setState({ usePassOpen: open })}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Use Baton Pass</DialogTitle>
          <DialogDescription>Continue this project in another installed coding agent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-3 text-left text-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!agent.installed}
              onClick={() => void continueWith(agent.id)}
            >
              <span className="font-medium text-zinc-100">{agent.displayName}</span>
              <Badge className={agent.installed ? "border-emerald-900 text-emerald-300" : "text-zinc-500"}>{agent.installed ? "Installed" : "Not detected"}</Badge>
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setState({ usePassOpen: false })}>Cancel</Button>
      </DialogContent>
    </Dialog>
  );
}

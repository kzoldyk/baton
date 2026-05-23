import type { AgentId } from "../../../shared/types";
import { AgentIcon } from "./AgentIcon";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { useAppStore } from "../store/useAppStore";

export function QuickLaunchAgentDialog(): JSX.Element {
  const { quickLaunchProjectId, projects, agents, selectProject, runAgent, setState } = useAppStore();
  const project = projects.find((p) => p.id === quickLaunchProjectId);
  const installed = agents.filter((a) => a.installed);

  const launch = async (agentId: AgentId): Promise<void> => {
    if (!quickLaunchProjectId) return;
    await selectProject(quickLaunchProjectId);
    await runAgent(agentId);
    setState({ quickLaunchProjectId: undefined });
  };

  return (
    <Dialog open={!!quickLaunchProjectId} onOpenChange={(open) => { if (!open) setState({ quickLaunchProjectId: undefined }); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Launch Agent</DialogTitle>
          <DialogDescription>Start a coding agent for {project?.name ?? "this project"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {installed.length === 0 ? (
            <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-6 text-center text-sm text-zinc-500">
              No installed agents detected.
            </div>
          ) : (
            installed.map((agent) => (
              <button
                key={agent.id}
                className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-3 text-left text-sm hover:bg-zinc-800"
                onClick={() => void launch(agent.id)}
              >
                <div className="flex items-center gap-2">
                  <AgentIcon agentId={agent.id} className="h-4 w-4 text-zinc-400" />
                  <span className="font-medium text-zinc-100">{agent.displayName}</span>
                </div>
                <Badge className="border-emerald-900 text-emerald-300">Installed</Badge>
              </button>
            ))
          )}
          {agents.filter((a) => !a.installed).length > 0 ? (
            <details className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-500">
              <summary className="cursor-pointer">Not detected ({agents.filter((a) => !a.installed).length})</summary>
              <div className="mt-2 space-y-1">
                {agents.filter((a) => !a.installed).map((agent) => (
                  <div key={agent.id} className="py-1 text-zinc-600">{agent.displayName}</div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => setState({ quickLaunchProjectId: undefined })}>Cancel</Button>
      </DialogContent>
    </Dialog>
  );
}

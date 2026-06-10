import type { AgentId } from "../../../shared/types";
import { AgentIcon } from "./AgentIcon";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";
import { ChevronRight } from "lucide-react";

export function QuickLaunchAgentDialog(): JSX.Element {
  const { quickLaunchProjectId, projects, agents, selectProject, runAgent, setState } = useAppStore();
  const project = projects.find((p) => p.id === quickLaunchProjectId);
  const installed = agents.filter((a) => a.installed);
  const notDetected = agents.filter((a) => !a.installed);

  const launch = async (agentId: AgentId): Promise<void> => {
    if (!quickLaunchProjectId) return;
    await selectProject(quickLaunchProjectId);
    await runAgent(agentId);
    setState({ quickLaunchProjectId: undefined });
  };

  return (
    <Dialog open={!!quickLaunchProjectId} onOpenChange={(open) => { if (!open) setState({ quickLaunchProjectId: undefined }); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <DialogHeader className="p-5 pb-2">
          <DialogTitle className="text-lg font-bold text-zinc-100">Launch Agent</DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Select an AI agent for <span className="text-emerald-400 font-medium">{project?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {installed.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 px-3 py-10 text-center">
                <p className="text-sm text-zinc-500">No installed agents detected.</p>
                <Button variant="link" className="mt-1 text-emerald-400 h-auto p-0" onClick={() => setState({ view: "settings" })}>
                  Check settings
                </Button>
              </div>
            ) : (
              installed.map((agent) => (
                <button
                  key={agent.id}
                  className="group relative flex flex-col items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center transition-all hover:border-zinc-700 hover:bg-zinc-800/80 active:scale-[0.98]"
                  onClick={() => void launch(agent.id)}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800/50 group-hover:bg-zinc-700/30">
                    <AgentIcon agentId={agent.id} className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-center min-w-0">
                    <span className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate w-full">{agent.displayName}</span>
                    <p className="mt-1 text-[10px] leading-tight text-zinc-500 line-clamp-1">
                      {agent.description}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900/30 px-6 py-4">
          <Button variant="ghost" onClick={() => setState({ quickLaunchProjectId: undefined })}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

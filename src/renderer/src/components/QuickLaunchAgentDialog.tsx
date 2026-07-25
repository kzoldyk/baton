import type { AgentId } from "../../../shared/types";
import { AgentIcon } from "./AgentIcon";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";
import { ScrollArea } from "./ui/scroll-area";

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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <DialogHeader className="p-6 pb-4 shrink-0 border-b border-zinc-900">
          <DialogTitle className="text-xl font-bold text-zinc-100">Launch Agent</DialogTitle>
          <DialogDescription className="text-zinc-400 mt-1">
            Select an AI agent to start working on <span className="text-emerald-400 font-medium">{project?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {installed.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-3 py-12 text-center">
                  <p className="text-sm text-zinc-500">No installed agents detected on your PATH.</p>
                  <Button variant="link" className="mt-2 text-emerald-400 hover:text-emerald-300" onClick={() => setState({ view: "settings" })}>
                    Check settings
                  </Button>
                </div>
              ) : (
                installed.map((agent) => (
                  <button
                    key={agent.id}
                    className="group relative flex items-center gap-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/10 p-3.5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900/30 hover:shadow-md active:scale-[0.98] hover:scale-[1.01]"
                    onClick={() => void launch(agent.id)}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950/80 border border-zinc-800/60 text-zinc-400 group-hover:border-zinc-700 group-hover:bg-zinc-900 transition-colors">
                      <AgentIcon agentId={agent.id} className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold tracking-tight text-zinc-200 group-hover:text-zinc-100">{agent.displayName}</span>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-500 line-clamp-2 group-hover:text-zinc-400">
                        {agent.description}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {notDetected.length > 0 && (
              <div className="mt-6 border-t border-zinc-900 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3 px-1">Available but not detected</p>
                <div className="flex flex-wrap gap-2 px-1">
                  {notDetected.map((agent) => (
                    <Badge key={agent.id} className="flex items-center gap-1.5 bg-zinc-900/25 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900/50 hover:border-zinc-700 border-zinc-850 transition-all cursor-default">
                      <AgentIcon agentId={agent.id} className="h-3.5 w-3.5" />
                      {agent.displayName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 border-t border-zinc-900 bg-zinc-950 px-6 py-4 shrink-0">
          <Button variant="ghost" onClick={() => setState({ quickLaunchProjectId: undefined })}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import type { AgentId } from "../../../shared/types";
import { AgentIcon } from "./AgentIcon";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";
import { ChevronRight } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

export function AgentSelectorDialog(): JSX.Element {
  const { usePassOpen, agents, runAgent, setState } = useAppStore();
  const installed = agents.filter((a) => a.installed);
  const notDetected = agents.filter((a) => !a.installed);

  const continueWith = async (agentId: AgentId): Promise<void> => {
    await runAgent(agentId, true);
    setState({ usePassOpen: false });
  };

  return (
    <Dialog open={usePassOpen} onOpenChange={(open) => setState({ usePassOpen: open })}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-100">Use Baton Pass</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Select an installed coding agent to continue your current work.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              {installed.map((agent) => (
                <button
                  key={agent.id}
                  className="group relative flex items-center gap-3.5 rounded-xl border border-zinc-800 bg-zinc-900/10 p-3.5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800/20 active:scale-[0.98] hover:scale-[1.01]"
                  onClick={() => void continueWith(agent.id)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 group-hover:text-emerald-400 transition-colors">
                    <AgentIcon agentId={agent.id} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-tight text-zinc-200 group-hover:text-zinc-100">{agent.displayName}</span>
                      <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-zinc-500 line-clamp-1 group-hover:text-zinc-400">
                      {agent.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {notDetected.length > 0 && (
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-3 px-1">Available but not detected</p>
                <div className="flex flex-wrap gap-2 px-1">
                  {notDetected.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-[11px] text-zinc-500 opacity-60">
                      <AgentIcon agentId={agent.id} className="h-3 w-3 opacity-50" />
                      {agent.displayName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900/30 px-6 py-4 shrink-0">
          <Button variant="ghost" onClick={() => setState({ usePassOpen: false })}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

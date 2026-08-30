import { useAppStore } from "../store/useAppStore";
import type { AgentId } from "../../../shared/types";
import { AgentPickerDialog } from "./AgentPickerDialog";
import { Sparkles, Zap } from "lucide-react";
import { Callout } from "./ui/callout";
import { agentLabel } from "../../../shared/types";

export function QuickLaunchAgentDialog(): JSX.Element {
  const { quickLaunchProjectId, projects, agents, selectProject, runAgent, setState } = useAppStore();
  const project = projects.find((p) => p.id === quickLaunchProjectId);

  return (
    <AgentPickerDialog
      open={!!quickLaunchProjectId}
      onOpenChange={(open) => { if (!open) setState({ quickLaunchProjectId: undefined }); }}
      title="Launch agent"
      description={<>Start a fresh session in <span className="font-medium text-orange-400">{project?.name ?? "this project"}</span>.</>}
      icon={Sparkles}
      agents={agents}
      onSelect={async (agentId: AgentId) => {
        if (!quickLaunchProjectId) return;
        await selectProject(quickLaunchProjectId);
        await runAgent(agentId);
        setState({ quickLaunchProjectId: undefined });
      }}
    />
  );
}

export function AgentSelectorDialog(): JSX.Element {
  const { usePassOpen, agents, tasks, latestHandoff, runAgent, setState } = useAppStore();
  const activeFeature = tasks.find((t) => t.status === "active");

  return (
    <AgentPickerDialog
      open={usePassOpen}
      onOpenChange={(open) => setState({ usePassOpen: open })}
      title="Continue with pass"
      description="The next agent reads only this feature's small Baton Pass — not the whole repo."
      icon={Zap}
      agents={agents}
      contextBanner={
        activeFeature ? (
          <Callout variant="info" title={`Active feature: ${activeFeature.title}`}>
            {latestHandoff
              ? `Last pass: ${agentLabel(latestHandoff.fromAgent)} → ${agentLabel(latestHandoff.toAgent ?? "next")}`
              : "No pass saved yet for this feature."}
          </Callout>
        ) : (
          <Callout variant="warning" title="No active feature">
            Create or switch to a feature first so yesterday's work does not mix with today's.
          </Callout>
        )
      }
      footerHint="Agent opens with a prompt to read .baton/latest-handoff.md"
      onSelect={async (agentId) => {
        await runAgent(agentId, true);
        setState({ usePassOpen: false });
      }}
    />
  );
}

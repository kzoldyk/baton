import { RefreshCw } from "lucide-react";
import { agentLabel } from "../../../shared/types";
import { Button } from "./ui/button";
import { Callout } from "./ui/callout";
import { ModalShell } from "./ui/modal-shell";
import { useAppStore } from "../store/useAppStore";

export function RefreshBeforePassDialog(): JSX.Element {
  const {
    refreshBeforePassOpen,
    latestHandoff,
    activeSessionId,
    sessions,
    handoffRefreshing,
    handoffRefreshError,
    confirmRefreshBeforePass,
    setState
  } = useAppStore();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const sessionLive = activeSession?.status === "running";

  return (
    <ModalShell
      open={refreshBeforePassOpen}
      onOpenChange={(open) => { if (!open) setState({ refreshBeforePassOpen: false }); }}
      title="Refresh pass first?"
      description="This feature already has a saved pass. Refresh it with your current agent before handing off to another one."
      icon={RefreshCw}
      className="max-w-md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-400" disabled={handoffRefreshing} onClick={() => void confirmRefreshBeforePass("cancel")}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" disabled={handoffRefreshing} onClick={() => void confirmRefreshBeforePass("skip")}>
            Skip refresh
          </Button>
          <Button
            size="sm"
            className="bg-orange-600 text-white hover:bg-orange-500"
            disabled={!sessionLive || handoffRefreshing}
            onClick={() => void confirmRefreshBeforePass("refresh")}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${handoffRefreshing ? "animate-spin" : ""}`} />
            {handoffRefreshing ? "Refreshing…" : "Refresh and continue"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 p-4 sm:p-6">
        {latestHandoff ? (
          <Callout variant="info" title="Existing pass">
            {agentLabel(latestHandoff.fromAgent)} → {agentLabel(latestHandoff.toAgent ?? "next")}
            {latestHandoff.summary ? ` · ${latestHandoff.summary}` : ""}
          </Callout>
        ) : null}

        {sessionLive && activeSession ? (
          <Callout variant="info">
            Current session: <span className="font-medium text-zinc-200">{agentLabel(activeSession.agentId)}</span> will rewrite the pass from live work.
          </Callout>
        ) : (
          <Callout variant="warning" title="No live session">
            Start or focus a running agent to refresh. You can skip refresh and edit the pass manually, or use emergency from git.
          </Callout>
        )}

        {handoffRefreshError ? <Callout variant="error">{handoffRefreshError}</Callout> : null}
      </div>
    </ModalShell>
  );
}

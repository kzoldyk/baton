import { Copy, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Callout } from "./ui/callout";
import { ModalShell } from "./ui/modal-shell";
import { useAppStore } from "../store/useAppStore";

export function HandoffPromptDialog(): JSX.Element {
  const { handoffPrompt, agents, injectHandoffForSession, skipHandoffForSession, runAgentError } = useAppStore();
  const agent = agents.find((a) => a.id === handoffPrompt?.agentId);
  const [copied, setCopied] = useState(false);

  const copyPrompt = async (): Promise<void> => {
    if (!handoffPrompt) return;
    const prompt = await window.baton.agents.continuePrompt(handoffPrompt.sessionId);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell
      open={!!handoffPrompt}
      onOpenChange={(open) => { if (!open) skipHandoffForSession(); }}
      title="Inject Baton Pass?"
      description={
        <>
          Only paste or inject when <span className="font-medium text-zinc-200">{agent?.displayName ?? "the agent"}</span> is waiting at a prompt — not during splash or login.
        </>
      }
      icon={Zap}
      className="max-w-md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-400" onClick={() => skipHandoffForSession()}>Skip</Button>
          <Button variant="secondary" size="sm" onClick={() => void copyPrompt()}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy prompt"}
          </Button>
          <Button
            size="sm"
            className="bg-orange-600 text-white hover:bg-orange-500"
            onClick={() => handoffPrompt && void injectHandoffForSession(handoffPrompt.sessionId)}
          >
            Inject now
          </Button>
        </div>
      }
    >
      <div className="space-y-3 p-4 sm:p-6">
        {runAgentError ? <Callout variant="error">{runAgentError}</Callout> : null}
        <Callout variant="info" title="What gets injected">
          A short prompt pointing at <code className="text-zinc-200">.baton/latest-handoff.md</code>, <code className="text-zinc-200">current-task.md</code>, and <code className="text-zinc-200">todos.md</code> only.
        </Callout>
      </div>
    </ModalShell>
  );
}

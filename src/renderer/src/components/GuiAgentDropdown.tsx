import { useState } from "react";
import { Bot, Check, ChevronDown, Download, FileText, Sparkles } from "lucide-react";
import type { GuiAgentTarget } from "../../../shared/types";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { formatGuiAgentPrompt, type GuiAgent } from "../lib/guiAgentBridge";
import { cn } from "../lib/cn";
import { AgentIcon } from "./AgentIcon";

export type GuiAgentDropdownProps = {
  passContent: string;
  projectId?: string;
  taskTitle?: string;
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  iconOnly?: boolean;
};

export function GuiAgentDropdown({
  passContent,
  projectId,
  taskTitle,
  label = "Copy for GUI Agent",
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false
}: GuiAgentDropdownProps): JSX.Element {
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string): void => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const handleCopy = async (agent: GuiAgent, name: string): Promise<void> => {
    const formatted = formatGuiAgentPrompt(agent, passContent, taskTitle);
    try {
      await navigator.clipboard.writeText(formatted);
      showFeedback(`Copied for ${name}!`);
    } catch {
      showFeedback("Copy failed");
    }
  };

  const handleExport = async (target: GuiAgentTarget, targetName: string): Promise<void> => {
    if (!projectId) {
      showFeedback("No project selected");
      return;
    }
    try {
      await window.baton.projects.exportRules(projectId, target, passContent);
      showFeedback(`Exported to ${targetName}!`);
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "transition-colors",
            feedback && "border-emerald-600/70 text-emerald-400 bg-emerald-950/20",
            className
          )}
          title={feedback ?? label}
        >
          {feedback ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              {!iconOnly ? <span className="ml-1.5 truncate text-emerald-400">{feedback}</span> : null}
            </>
          ) : (
            <>
              <Bot className="h-3.5 w-3.5 text-zinc-300" />
              {!iconOnly ? (
                <>
                  <span className="mx-1.5 truncate">{label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </>
              ) : null}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            Copy for GUI Agent
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void handleCopy("cursor", "Cursor")}>
            <AgentIcon agentId="cursor" className="mr-2.5 h-4.5 w-4.5" />
            <span>Cursor Composer</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleCopy("windsurf", "Windsurf")}>
            <AgentIcon agentId="windsurf" className="mr-2.5 h-4.5 w-4.5" />
            <span>Windsurf Cascade</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleCopy("claude", "Claude")}>
            <AgentIcon agentId="claude" className="mr-2.5 h-4.5 w-4.5" />
            <span>Claude Desktop</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleCopy("copilot", "Copilot")}>
            <AgentIcon agentId="copilot" className="mr-2.5 h-4.5 w-4.5" />
            <span>GitHub Copilot</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Download className="h-3.5 w-3.5 text-sky-400" />
            Export Rules to Project
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!projectId}
            onClick={() => void handleExport("cursor", ".cursorrules")}
          >
            <FileText className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            <span>Export to .cursorrules</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!projectId}
            onClick={() => void handleExport("windsurf", ".windsurfrules")}
          >
            <FileText className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            <span>Export to .windsurfrules</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!projectId}
            onClick={() => void handleExport("instructions", "INSTRUCTIONS.md")}
          >
            <FileText className="mr-2 h-3.5 w-3.5 text-zinc-400" />
            <span>Export to INSTRUCTIONS.md</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

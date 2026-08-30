import { CheckCircle2, Circle, Layers, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BatonTask } from "../../../shared/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CollapsibleSection } from "./ui/collapsible-section";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Callout } from "./ui/callout";

type FeaturePanelProps = {
  tasks: BatonTask[];
  activeFeature?: BatonTask;
  onCreate: (title: string) => Promise<void>;
  onActivate: (taskId: string) => Promise<void>;
  onCycleStatus: (taskId: string, current: BatonTask["status"]) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
};

export function FeaturePanel({ tasks, activeFeature, onCreate, onActivate, onCycleStatus, onDelete }: FeaturePanelProps): JSX.Element {
  const [title, setTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <CollapsibleSection
      title="Features"
      tooltip="Each feature keeps its own pass and todos. Only one is active at a time."
      badge={<span className="text-zinc-600">{tasks.filter((t) => t.status === "completed").length}/{tasks.length}</span>}
    >
      {!activeFeature && tasks.length > 0 ? (
        <Callout variant="warning" title="Pick a feature">
          Click a paused feature name to make it active before passing work to another agent.
        </Callout>
      ) : null}

      <div className="space-y-1">
        {tasks.length === 0 ? (
          <Callout variant="info">Add a feature like "Auth refactor" or "Billing webhooks" before creating a pass.</Callout>
        ) : (
          tasks.map((task) => (
            <div key={task.id}>
              {confirmDelete === task.id ? (
                <ConfirmRow
                  message="Remove this feature from Baton?"
                  onConfirm={() => { void onDelete(task.id); setConfirmDelete(null); }}
                  onCancel={() => setConfirmDelete(null)}
                />
              ) : (
                <div
                  className={`group flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 ${
                    task.status === "active" ? "border-orange-500/40 bg-orange-500/5" : "border-zinc-800 bg-zinc-900/50"
                  }`}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="shrink-0" onClick={() => void onCycleStatus(task.id, task.status)}>
                        {task.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-orange-500" />
                          : task.status === "paused" ? <Minus className="h-4 w-4 text-amber-400" />
                          : <Circle className="h-4 w-4 text-orange-400" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {task.status === "active" ? "Pause feature" : task.status === "paused" ? "Mark done" : "Reopen feature"}
                    </TooltipContent>
                  </Tooltip>

                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate text-left text-xs ${
                      task.status === "completed" ? "text-zinc-500 line-through"
                      : task.status === "active" ? "font-medium text-zinc-100"
                      : "text-amber-200/90"
                    }`}
                    onClick={() => { if (task.status !== "active") void onActivate(task.id); }}
                  >
                    {task.title}
                  </button>

                  {task.status === "active" ? (
                    <Badge className="shrink-0 border-orange-800/80 bg-orange-950/40 px-1.5 text-[10px] text-orange-300">
                      <Layers className="mr-0.5 inline h-3 w-3" />
                      live
                    </Badge>
                  ) : task.status === "paused" ? (
                    <Badge className="shrink-0 border-amber-900 px-1 text-[10px] text-amber-400">paused</Badge>
                  ) : null}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="hidden shrink-0 text-zinc-600 hover:text-red-400 group-hover:flex"
                        onClick={() => setConfirmDelete(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Remove feature</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          ))
        )}

        <div className="flex min-w-0 gap-2 pt-1">
          <Input
            className="h-7 min-w-0 text-xs"
            value={title}
            placeholder="New feature…"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                void onCreate(title.trim());
                setTitle("");
              }
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-7 shrink-0 px-2"
                variant="secondary"
                size="sm"
                disabled={!title.trim()}
                onClick={() => { void onCreate(title.trim()); setTitle(""); }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create feature and make it active</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function ConfirmRow({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1.5">
      <span className="flex-1 truncate text-xs text-red-300">{message}</span>
      <button type="button" onClick={onConfirm} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Remove</button>
      <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
    </div>
  );
}

import { Bot, FolderPlus, MessageSquare, Settings, Server } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { useAppStore } from "../store/useAppStore";

export function Sidebar(): JSX.Element {
  const { projects, selectedProjectId, gitStatus, selectProject, setState } = useAppStore();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="h-16 px-4 pt-10 text-xs font-medium uppercase tracking-wide text-zinc-500">Projects</div>
      <ScrollArea className="flex-1 px-2">
        {projects.length === 0 ? (
          <div className="px-3 py-6 text-sm text-zinc-500">No projects yet.</div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => {
              const selected = project.id === selectedProjectId;
              return (
                <button
                  key={project.id}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${selected ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}
                  onClick={() => void selectProject(project.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{project.name}</span>
                    {selected && gitStatus?.isRepo ? (
                      <span className="shrink-0 text-xs">
                        <span className="text-emerald-400">+{gitStatus.additions}</span> <span className="text-red-400">-{gitStatus.deletions}</span>
                      </span>
                    ) : null}
                  </div>
                  {selected ? <div className="mt-1 truncate text-xs text-zinc-500">{gitStatus?.branch || project.path}</div> : null}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <Separator />
      <div className="space-y-1 p-2">
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}>
          <FolderPlus className="h-4 w-4" /> Add Project <Badge className="ml-auto">⇧⌘N</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ view: "workspace" })}>
          <Bot className="h-4 w-4" /> Skills
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ view: "mcp" })}>
          <Server className="h-4 w-4" /> MCP
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ view: "settings" })}>
          <Settings className="h-4 w-4" /> Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start text-zinc-500">
          <MessageSquare className="h-4 w-4" /> Give feedback
        </Button>
      </div>
    </aside>
  );
}

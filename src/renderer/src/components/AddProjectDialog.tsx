import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { useAppStore } from "../store/useAppStore";

export function AddProjectDialog(): JSX.Element {
  const [projectPath, setProjectPath] = useState("");
  const { addProjectOpen, addProjectError, addProject, addProjectByPath, setState } = useAppStore();

  return (
    <Dialog open={addProjectOpen} onOpenChange={(open) => setState({ addProjectOpen: open, addProjectError: undefined })}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>Select a local project folder. Baton will register it locally and create a lightweight `.baton` bridge.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button className="w-full" onClick={() => void addProject()}>
            <FolderPlus className="h-4 w-4" />
            Choose Folder
          </Button>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Or enter a project path</label>
            <Input value={projectPath} onChange={(event) => setProjectPath(event.target.value)} placeholder="/home/user/projects/my-project" />
          </div>
          {addProjectError ? <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">{addProjectError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setState({ addProjectOpen: false, addProjectError: undefined })}>
              Cancel
            </Button>
            <Button disabled={!projectPath.trim()} onClick={() => void addProjectByPath(projectPath.trim())}>
              Add Path
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

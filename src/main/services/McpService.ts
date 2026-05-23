import type { McpServer } from "../../shared/types";

export class McpService {
  list(): McpServer[] {
    return [
      { name: "lazyweb", status: "running", detail: "web research and external lookup" },
      { name: "github", status: "unknown", detail: "token-dependent repository context" },
      { name: "hs-ai-context", status: "running", detail: "local project context search" },
      { name: "filesystem", status: "running", detail: "local file visibility for agents" }
    ];
  }
}

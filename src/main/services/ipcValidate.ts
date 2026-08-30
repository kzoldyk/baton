export function requireId(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${label}.`);
  }
  if (value.includes("..") || value.includes("/") || value.includes("\\") || value.includes("\0")) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

export function optionalId(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireId(value, label);
}

export function requireStatus(value: unknown): "active" | "paused" | "completed" {
  if (value === "active" || value === "paused" || value === "completed") return value;
  throw new Error("Invalid task status.");
}

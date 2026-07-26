// src/core/utils/workspace.ts
export interface WorkspaceSummary {
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  memberCount: number;
}

/**
 * Fetches high-level workspace metadata for the dashboard shell header.
 * TODO: Replace mock with real data source (DB/API) in a later task.
 */
export async function getWorkspaceSummary(): Promise<WorkspaceSummary> {
  // Simulates async I/O latency (e.g., a DB call) to validate Suspense behavior.
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    id: "ws-001",
    name: "Infinity X — Demo Workspace",
    plan: "enterprise",
    memberCount: 42,
  };
}

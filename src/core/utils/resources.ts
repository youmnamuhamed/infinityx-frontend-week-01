// src/core/utils/resources.ts
export interface ResourceMetric {
  id: string;
  name: string;
  type: "compute" | "storage" | "database" | "network";
  status: "healthy" | "degraded" | "offline";
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  lastUpdatedIso: string;
}

/**
 * Fetches metrics for a single resource by ID.
 * TODO: Replace mock with real data source (DB/API) in a later task.
 */
export async function getResourceMetrics(
  resourceId: string,
): Promise<ResourceMetric> {
  // Simulates async I/O latency to validate Suspense fallback behavior.
  await new Promise((resolve) => setTimeout(resolve, 75));

  return {
    id: resourceId,
    name: `Resource ${resourceId}`,
    type: "compute",
    status: "healthy",
    cpuUsagePercent: 42,
    memoryUsagePercent: 61,
    lastUpdatedIso: new Date().toISOString(),
  };
}

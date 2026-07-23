// src/core/utils/metrics.ts
import { unstable_cache } from "next/cache";

export interface BillingMeterData {
  currentSpendUsd: number;
  projectedSpendUsd: number;
  billingCycleEndIso: string;
}

export interface NodeCountData {
  activeNodes: number;
  totalNodes: number;
  region: string;
}

export interface ClusterStatusData {
  status: "operational" | "degraded" | "outage";
  uptimePercent: number;
  lastIncidentIso: string | null;
}

async function fetchBillingMeter(
  workspaceId: string,
): Promise<BillingMeterData> {
  // Simulates a slower widget to demonstrate independent Suspense streaming.
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    currentSpendUsd: 4820.5,
    projectedSpendUsd: 6100,
    billingCycleEndIso: new Date(
      Date.now() + 12 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

async function fetchNodeCount(workspaceId: string): Promise<NodeCountData> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    activeNodes: 27,
    totalNodes: 30,
    region: "eu-west-1",
  };
}

async function fetchClusterStatus(
  workspaceId: string,
): Promise<ClusterStatusData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    status: "operational",
    uptimePercent: 99.982,
    lastIncidentIso: null,
  };
}

/**
 * TODO: Replace mock fetchers with real API calls once a backend exists.
 * `unstable_cache` tags each result under "workspace-metrics", so a single
 * `revalidateTag("workspace-metrics")` call (e.g. from a webhook) invalidates
 * all three widgets at once without needing per-widget revalidation logic.
 */
export const getBillingMeter = unstable_cache(
  fetchBillingMeter,
  ["billing-meter"],
  {
    tags: ["workspace-metrics"],
    revalidate: 60,
  },
);

export const getNodeCount = unstable_cache(fetchNodeCount, ["node-count"], {
  tags: ["workspace-metrics"],
  revalidate: 60,
});

export const getClusterStatus = unstable_cache(
  fetchClusterStatus,
  ["cluster-status"],
  {
    tags: ["workspace-metrics"],
    revalidate: 60,
  },
);

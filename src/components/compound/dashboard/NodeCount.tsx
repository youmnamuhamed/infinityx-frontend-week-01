// src/components/compound/dashboard/NodeCount.tsx
import { getNodeCount } from "@/core/utils/metrics";

interface NodeCountProps {
  workspaceId: string;
}

export async function NodeCount({ workspaceId }: NodeCountProps) {
  const data = await getNodeCount(workspaceId);

  return (
    <div className="metric-card" aria-labelledby="node-count-title">
      <h2 id="node-count-title">Active Nodes</h2>
      <p className="metric-card__value">
        {data.activeNodes} <span>/ {data.totalNodes}</span>
      </p>
      <p className="metric-card__meta">Region: {data.region}</p>
    </div>
  );
}

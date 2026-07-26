// src/components/compound/dashboard/ClusterStatus.tsx
import { getClusterStatus } from "@/core/utils/metrics";

interface ClusterStatusProps {
  workspaceId: string;
}

export async function ClusterStatus({ workspaceId }: ClusterStatusProps) {
  const data = await getClusterStatus(workspaceId);

  return (
    <div className="metric-card" aria-labelledby="cluster-status-title">
      <h2 id="cluster-status-title">Cluster Status</h2>
      <p className={`metric-card__status metric-card__status--${data.status}`}>
        {data.status}
      </p>
      <p className="metric-card__meta">Uptime: {data.uptimePercent}%</p>
    </div>
  );
}

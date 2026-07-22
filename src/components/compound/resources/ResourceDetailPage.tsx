// src/components/compound/resources/ResourceDetailPage.tsx
import type { ResourceMetric } from "@/core/utils/resources";

interface ResourceDetailPageProps {
  resource: ResourceMetric;
  workspaceId: string;
}

export function ResourceDetailPage({
  resource,
  workspaceId,
}: ResourceDetailPageProps) {
  return (
    <article className="resource-detail-page">
      <nav aria-label="Breadcrumb" className="resource-detail-page__breadcrumb">
        <span>Workspace {workspaceId}</span> / <span>{resource.name}</span>
      </nav>

      <header className="resource-detail-page__header">
        <h1>{resource.name}</h1>
        <span className={`resource-status resource-status--${resource.status}`}>
          {resource.status}
        </span>
      </header>

      <dl className="resource-detail-page__stats">
        <div>
          <dt>Type</dt>
          <dd>{resource.type}</dd>
        </div>
        <div>
          <dt>CPU Usage</dt>
          <dd>{resource.cpuUsagePercent}%</dd>
        </div>
        <div>
          <dt>Memory Usage</dt>
          <dd>{resource.memoryUsagePercent}%</dd>
        </div>
        <div>
          <dt>Last Updated</dt>
          <dd>{new Date(resource.lastUpdatedIso).toLocaleString()}</dd>
        </div>
      </dl>
    </article>
  );
}

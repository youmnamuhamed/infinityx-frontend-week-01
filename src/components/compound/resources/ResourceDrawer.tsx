// src/components/compound/resources/ResourceDrawer.tsx
import type { ResourceMetric } from "@/core/utils/resources";

interface ResourceDrawerProps {
  resource: ResourceMetric;
}

export function ResourceDrawer({ resource }: ResourceDrawerProps) {
  return (
    <div
      className="resource-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-drawer-title"
    >
      <div className="resource-drawer__panel">
        <header className="resource-drawer__header">
          <h2 id="resource-drawer-title">{resource.name}</h2>
          <span
            className={`resource-status resource-status--${resource.status}`}
          >
            {resource.status}
          </span>
        </header>

        <dl className="resource-drawer__stats">
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
        </dl>
      </div>
    </div>
  );
}

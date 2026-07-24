// src/app/(dashboard)/workspaces/[workspaceId]/analytics/page.tsx
import { Suspense } from "react";

import { BillingMeter } from "@/components/compound/dashboard/BillingMeter";
import { NodeCount } from "@/components/compound/dashboard/NodeCount";
import { ClusterStatus } from "@/components/compound/dashboard/ClusterStatus";
import { MetricsCardSkeleton } from "@/components/skeletons/MetricsCardSkeleton";
import { ResourceLink } from "@/components/compound/resources/ResourceLink";

interface AnalyticsPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { workspaceId } = await params;

  return (
    <section aria-labelledby="analytics-heading">
      <h1 id="analytics-heading">Analytics — Workspace {workspaceId}</h1>

      <div className="metrics-grid">
        <Suspense fallback={<MetricsCardSkeleton />}>
          <BillingMeter workspaceId={workspaceId} />
        </Suspense>

        <Suspense fallback={<MetricsCardSkeleton />}>
          <NodeCount workspaceId={workspaceId} />
        </Suspense>

        <Suspense fallback={<MetricsCardSkeleton />}>
          <ClusterStatus workspaceId={workspaceId} />
        </Suspense>
      </div>
      <div className="resource-links-demo">
        <p className="resource-links-demo__label">Resource Preview Demo</p>
        <ResourceLink workspaceId={workspaceId} resourceId="res-001">
          View Resource res-001 →
        </ResourceLink>
      </div>
    </section>
  );
}

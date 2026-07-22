// src/app/(dashboard)/workspaces/[workspaceId]/resources/[resourceId]/page.tsx
import { Suspense } from "react";

import { getResourceMetrics } from "@/core/utils/resources";
import { ResourceListSkeleton } from "@/components/skeletons/ResourceListSkeleton";
import { ResourceDetailPage } from "@/components/compound/resources/ResourceDetailPage";

interface ResourcePageProps {
  params: Promise<{ workspaceId: string; resourceId: string }>;
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { workspaceId, resourceId } = await params;

  return (
    <Suspense fallback={<ResourceListSkeleton />}>
      <ResourcePageContent workspaceId={workspaceId} resourceId={resourceId} />
    </Suspense>
  );
}

async function ResourcePageContent({
  workspaceId,
  resourceId,
}: {
  workspaceId: string;
  resourceId: string;
}) {
  const resource = await getResourceMetrics(resourceId);

  return <ResourceDetailPage resource={resource} workspaceId={workspaceId} />;
}
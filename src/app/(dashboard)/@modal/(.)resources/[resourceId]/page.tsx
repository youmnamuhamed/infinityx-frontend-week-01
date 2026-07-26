// src/app/(dashboard)/@modal/(.)resources/[resourceId]/page.tsx
import { Suspense } from "react";

import { getResourceMetrics } from "@/core/utils/resources";
import { ResourceListSkeleton } from "@/components/skeletons/ResourceListSkeleton";
import { ResourceDrawer } from "@/components/compound/resources/ResourceDrawer";

interface ResourceModalPageProps {
  params: Promise<{ resourceId: string }>;
}

export default async function ResourceModalPage({ params }: ResourceModalPageProps) {
  const { resourceId } = await params;

  return (
    <Suspense fallback={<ResourceListSkeleton />}>
      <ResourceModalContent resourceId={resourceId} />
    </Suspense>
  );
}

async function ResourceModalContent({ resourceId }: { resourceId: string }) {
  const resource = await getResourceMetrics(resourceId);

  return <ResourceDrawer resource={resource} />;
}

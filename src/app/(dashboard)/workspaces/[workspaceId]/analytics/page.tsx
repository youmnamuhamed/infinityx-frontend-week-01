// src/app/(dashboard)/workspaces/[workspaceId]/analytics/page.tsx
interface AnalyticsPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { workspaceId } = await params;

  return (
    <section aria-labelledby="analytics-heading">
      <h1 id="analytics-heading">Analytics — Workspace {workspaceId}</h1>
      <p>
        Metrics widgets (billing meter, node count, cluster status) will
        populate here.
      </p>
    </section>
  );
}

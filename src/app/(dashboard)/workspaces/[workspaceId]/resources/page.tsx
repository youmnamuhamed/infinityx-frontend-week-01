// src/app/(dashboard)/workspaces/[workspaceId]/resources/page.tsx
interface ResourcesIndexPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function ResourcesIndexPage({ params }: ResourcesIndexPageProps) {
  const { workspaceId } = await params;

  return (
    <section aria-labelledby="resources-heading">
      <h1 id="resources-heading">Resources — Workspace {workspaceId}</h1>
      <p>The full resource data grid (Task 2) will render here.</p>
    </section>
  );
}
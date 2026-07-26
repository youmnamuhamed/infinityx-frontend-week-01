// src/app/(dashboard)/workspaces/[workspaceId]/settings/page.tsx
interface SettingsPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { workspaceId } = await params;

  return (
    <section aria-labelledby="settings-heading">
      <h1 id="settings-heading">Settings — Workspace {workspaceId}</h1>
      <p>Workspace configuration controls will live here.</p>
    </section>
  );
}

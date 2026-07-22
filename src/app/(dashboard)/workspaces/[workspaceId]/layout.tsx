// src/app/(dashboard)/workspaces/[workspaceId]/layout.tsx
import type { ReactNode } from "react";

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceId } = await params;

  return (
    <div className="workspace-scope" data-workspace-id={workspaceId}>
      <nav className="workspace-subnav" aria-label="Workspace navigation">
        <a href={`/workspaces/${workspaceId}/analytics`}>Analytics</a>
        <a href={`/workspaces/${workspaceId}/settings`}>Settings</a>
      </nav>
      {children}
    </div>
  );
}

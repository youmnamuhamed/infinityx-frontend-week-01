// src/app/(dashboard)/layout.tsx
import { cookies } from "next/headers";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { getWorkspaceSummary } from "@/core/utils/workspace";
import { MetricsCardSkeleton } from "@/components/skeletons/MetricsCardSkeleton";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { SidebarToggle } from "@/components/layout/SidebarToggle";

const SIDEBAR_COOKIE_KEY = "ix-sidebar-state";

interface DashboardLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default async function DashboardLayout({
  children,
  modal,
}: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get(SIDEBAR_COOKIE_KEY)?.value ?? "expanded";
  const isSidebarCollapsed = sidebarState === "collapsed";

  const workspaceSummary = await getWorkspaceSummary();

  return (
    <div
      className="dashboard-shell"
      data-sidebar={isSidebarCollapsed ? "collapsed" : "expanded"}
    >
      <aside className="dashboard-sidebar" aria-label="Primary navigation">
        <SidebarToggle isCollapsed={isSidebarCollapsed} />
        <nav>
          <ul>
            <li>Analytics</li>
            <li>Settings</li>
            <li>Resources</li>
          </ul>
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <WorkspaceSwitcher currentWorkspaceName={workspaceSummary.name} />
        </header>

        <Suspense fallback={<MetricsCardSkeleton />}>
          <main className="dashboard-content">{children}</main>
        </Suspense>
      </div>

      {modal}
    </div>
  );
}

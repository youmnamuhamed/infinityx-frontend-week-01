// src/components/layout/Sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { navGroups } from "@/core/config/navigation";
import { SidebarToggle } from "@/components/layout/SidebarToggle";

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  // Derive the active workspace ID from the URL itself, since the root
  // dashboard layout sits above the [workspaceId] segment and never
  // receives it as a route param.
  const workspaceIdMatch = pathname.match(/^\/workspaces\/([^/]+)/);
  const workspaceId = workspaceIdMatch?.[1] ?? "";

  return (
    <aside className="dashboard-sidebar" aria-label="Primary navigation">
      <div className="sidebar-logo">
        <Image
          src="/infinitylogo.webp"
          alt="Infinity X"
          width={28}
          height={28}
          className="sidebar-logo__badge"
          priority
        />
        {!isCollapsed && <span className="sidebar-logo__text">Infinity X</span>}
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div className="sidebar-nav__group" key={group.label}>
            {!isCollapsed && (
              <p className="sidebar-nav__group-label">{group.label}</p>
            )}
            <ul>
              {group.items.map((item) => {
                const href = item.href(workspaceId);
                const isActive = pathname === href;
                const Icon = item.icon;

                return (
                  <li key={item.label}>
                    <Link
                      href={href}
                      className="sidebar-nav__link"
                      data-active={isActive}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon size={18} strokeWidth={2} aria-hidden="true" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <SidebarToggle isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}

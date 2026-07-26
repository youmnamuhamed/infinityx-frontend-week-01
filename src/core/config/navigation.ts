// src/core/config/navigation.ts
import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, Settings } from "lucide-react";

export interface NavItem {
  label: string;
  href: (workspaceId: string) => string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Analytics",
        href: (workspaceId) => `/workspaces/${workspaceId}/analytics`,
        icon: BarChart3,
      },
      {
        label: "Resources",
        href: (workspaceId) => `/workspaces/${workspaceId}/resources`,
        icon: Boxes,
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        label: "Settings",
        href: (workspaceId) => `/workspaces/${workspaceId}/settings`,
        icon: Settings,
      },
    ],
  },
];

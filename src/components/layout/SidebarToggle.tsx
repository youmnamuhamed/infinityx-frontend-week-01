// src/components/layout/SidebarToggle.tsx
"use client";

import { useTransition } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { setSidebarState } from "@/core/utils/sidebar";

interface SidebarToggleProps {
  isCollapsed: boolean;
}

export function SidebarToggle({ isCollapsed }: SidebarToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const nextState = isCollapsed ? "expanded" : "collapsed";
    startTransition(() => {
      setSidebarState(nextState);
    });
  }

  return (
    <button
      type="button"
      className="sidebar-toggle"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={isCollapsed}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      {!isCollapsed && <span>Collapse</span>}
    </button>
  );
}

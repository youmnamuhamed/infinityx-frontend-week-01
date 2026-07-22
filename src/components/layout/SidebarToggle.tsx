// src/components/layout/SidebarToggle.tsx
"use client";

import { useTransition } from "react";

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
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={isCollapsed}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? "»" : "«"}
    </button>
  );
}

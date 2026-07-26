// src/components/compound/resources/ResourceLink.tsx
"use client";

import Link from "next/link";

import { useHoverPrefetch } from "@/core/hooks/useHoverPrefetch";

interface ResourceLinkProps {
  workspaceId: string;
  resourceId: string;
  children: React.ReactNode;
}

export function ResourceLink({
  workspaceId,
  resourceId,
  children,
}: ResourceLinkProps) {
  const href = `/workspaces/${workspaceId}/resources/${resourceId}`;
  const { onMouseEnter, onMouseLeave } = useHoverPrefetch(href);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
}

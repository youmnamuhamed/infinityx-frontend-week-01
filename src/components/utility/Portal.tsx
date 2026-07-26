"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * IX-Design — Portal
 * -----------------------------------------------------------------------
 * Renders children into a DOM node outside the normal component tree
 * (default: document.body), so overlays/dialogs/popovers aren't clipped
 * by an ancestor's `overflow: hidden` or trapped under a lower z-index
 * stacking context (e.g. the dashboard shell's CSS grid).
 *
 * SSR-safe: given this app uses streaming SSR (Task 1), `document`
 * doesn't exist during server rendering. Rather than reaching for
 * `typeof window !== "undefined"` checks scattered through render
 * logic, this defers to a client-only mount flag set in an effect —
 * the first render (server + initial client hydration pass) renders
 * nothing, then the portal attaches once mounted. This avoids
 * hydration-mismatch warnings since server and client agree on "render
 * nothing" for that first pass.
 */

export interface PortalProps {
  children: ReactNode;
  /**
   * Target DOM node to render into. Defaults to a dedicated
   * `#ix-portal-root` element (created on demand) rather than
   * document.body directly, keeping portal content out of the way of
   * anything that walks document.body's direct children.
   */
  container?: HTMLElement;
}

function getOrCreateDefaultRoot(): HTMLElement {
  const existing = document.getElementById("ix-portal-root");
  if (existing) return existing;

  const root = document.createElement("div");
  root.id = "ix-portal-root";
  document.body.appendChild(root);
  return root;
}

export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const target = container ?? getOrCreateDefaultRoot();
  return createPortal(children, target);
}

export default Portal;

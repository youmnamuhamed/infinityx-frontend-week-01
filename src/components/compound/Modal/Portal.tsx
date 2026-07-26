"use client";

import type { ReactNode } from "react";
import { Portal as BasePortal } from "@/components/utility/Portal";
import { useModalContext } from "./context";

export interface ModalPortalProps {
  children: ReactNode;
}

export function ModalPortal({ children }: ModalPortalProps) {
  const { open } = useModalContext("Portal");

  // Unmounting Overlay/Content when closed (rather than hiding via CSS)
  // keeps focus-trap effects and body-scroll-lock cleanup running
  // reliably on every close, and keeps closed dialogs out of the a11y tree.
  if (!open) return null;

  return <BasePortal>{children}</BasePortal>;
}

export default ModalPortal;

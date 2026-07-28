"use client";

import { useId, useRef, type ReactNode } from "react";
import { ModalContext } from "./context";

export interface ModalRootProps {
  /** Controlled open state — the consumer owns this, matching the compound API's usage in the spec. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * The bare <Modal> tag itself acts as the root/provider — sub-components
 * (Trigger, Portal, Overlay, Content, ...) are attached to it as static
 * properties in ./index.tsx, so consumers write:
 *
 *   <Modal open={open} onOpenChange={setOpen}>
 *     <Modal.Trigger>...</Modal.Trigger>
 *     ...
 *   </Modal>
 */
export function ModalRoot({ open, onOpenChange, children }: ModalRootProps) {
  const titleId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <ModalContext.Provider value={{ open, onOpenChange, titleId, triggerRef }}>
      {children}
    </ModalContext.Provider>
  );
}

export default ModalRoot;

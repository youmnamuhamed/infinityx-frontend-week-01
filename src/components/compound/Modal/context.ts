"use client";

import { createContext, useContext, type RefObject } from "react";

export interface ModalContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Stable id (via useId) so Modal.Content and Modal.Title can link via aria-labelledby without prop drilling. */
  titleId: string;
  /** Populated by Modal.Trigger; read by nothing directly, but kept here for future use (e.g. multiple triggers). */
  triggerRef: RefObject<HTMLElement | null>;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * All Modal.* sub-components call this instead of useContext directly,
 * so a mistake like rendering <Modal.Title> outside a <Modal> fails
 * loudly with a clear message instead of crashing on `null.titleId`.
 */
export function useModalContext(componentName: string): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error(
      `Modal.${componentName} must be rendered within a <Modal> root component.`
    );
  }
  return ctx;
}

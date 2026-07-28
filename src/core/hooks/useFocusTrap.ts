"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * IX-Design — useFocusTrap
 * -----------------------------------------------------------------------
 * Traps keyboard focus inside a container while `active` is true, and
 * restores focus to whatever was focused beforehand once deactivated.
 * Used by <Modal.Content> and any other dialog-like surface (e.g. a
 * future Combobox popover in "modal" mode).
 *
 * Responsibilities:
 *  1. Snapshot `document.activeElement` when activated.
 *  2. Move focus into the container (to `initialFocusRef`, or the first
 *     focusable element, or the container itself as a fallback).
 *  3. Wrap Tab / Shift+Tab at the container's edges so focus can never
 *     leave via keyboard.
 *  4. Catch focus that escapes via non-keyboard means (e.g. a
 *     programmatic .focus() call elsewhere) and pull it back in.
 *  5. On deactivation, return focus to the snapshotted element — unless
 *     it's no longer in the DOM, in which case focus is left alone
 *     rather than thrown at document.body.
 *
 * This does NOT handle Escape-to-close — that's a dismissal concern
 * owned by the component using the trap (e.g. <Modal>), since only it
 * knows what "closing" means for its own state.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      el.offsetParent !== null && // excludes display:none subtrees
      el.getAttribute("aria-hidden") !== "true",
  );
}

export interface UseFocusTrapOptions {
  /** Whether the trap is currently engaged. */
  active: boolean;
  /** Element to focus first when the trap activates, overriding the default (first focusable child). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Whether to restore focus to the pre-activation element on deactivation. Default: true. */
  returnFocusOnDeactivate?: boolean;
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions,
): RefObject<T | null> {
  const { active, initialFocusRef, returnFocusOnDeactivate = true } = options;

  const containerRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusInitialElement = () => {
      const target =
        initialFocusRef?.current ?? getFocusableElements(container)[0];

      if (target) {
        target.focus();
      } else {
        // No focusable descendants — the container itself becomes the
        // focus anchor so Escape/Tab handling still has somewhere to live.
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    };

    // Deferred one frame so portal-rendered content has mounted and the
    // browser has laid out the newly-visible dialog before we focus it.
    const raf = requestAnimationFrame(focusInitialElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !container.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !container.contains(current)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // Guards against focus leaving via non-Tab means (e.g. a stray
    // programmatic .focus() call from unrelated app code).
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && !container.contains(target)) {
        const [first] = getFocusableElements(container);
        (first ?? container).focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);

      if (returnFocusOnDeactivate) {
        const toRestore = previouslyFocusedRef.current;
        if (toRestore && document.body.contains(toRestore)) {
          toRestore.focus();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return containerRef;
}

export default useFocusTrap;

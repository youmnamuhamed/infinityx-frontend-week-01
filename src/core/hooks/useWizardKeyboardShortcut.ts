// src/core/hooks/useWizardKeyboardShortcut.ts
"use client";

import { useEffect } from "react";

interface UseWizardKeyboardShortcutOptions {
  /** The id of the currently-mounted step form, if the active step has one */
  formId?: string;
  /** Fallback action for steps with no <form> (e.g. the review/submit step) */
  onShortcut?: () => void;
}

/**
 * Cmd/Ctrl + Enter submits whichever step form is currently mounted, via the
 * browser's native form.requestSubmit(). That re-runs the form's own
 * validation (react-hook-form + zod) exactly as if the user had clicked
 * Continue — so "only advance when the current step is valid" falls out for
 * free, with no separate validity check needed here.
 */
export function useWizardKeyboardShortcut({
  formId,
  onShortcut,
}: UseWizardKeyboardShortcutOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSubmitCombo = (event.metaKey || event.ctrlKey) && event.key === "Enter";
      if (!isSubmitCombo) return;

      if (formId) {
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) {
          event.preventDefault();
          form.requestSubmit();
          return;
        }
      }

      if (onShortcut) {
        event.preventDefault();
        onShortcut();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formId, onShortcut]);
}
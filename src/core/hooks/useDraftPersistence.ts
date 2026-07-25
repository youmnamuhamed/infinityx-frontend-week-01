// src/core/hooks/useDraftPersistence.ts
import { useEffect, useRef, useState, useCallback } from "react";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  type DraftEnvelope,
} from "@/core/utils/draftStorage";

interface UseDraftPersistenceOptions<TContext> {
  workspaceId: string;
  currentStepId: string;
  context: TContext;
  /** Don't autosave until the user has actually touched something */
  enabled: boolean;
  debounceMs?: number;
}

interface UseDraftPersistenceResult<TContext> {
  /** Populated once on mount if a usable draft was found; null after restore/dismiss */
  pendingDraft: DraftEnvelope<TContext> | null;
  /** Returns the draft for the caller to apply, and clears the "pending" flag */
  restoreDraft: () => DraftEnvelope<TContext> | null;
  /** User explicitly said "no thanks" — wipe it so it doesn't resurface */
  dismissDraft: () => void;
  /** Call after a successful submit so the finished workflow doesn't linger */
  clearSavedDraft: () => void;
  isSaving: boolean;
}

export function useDraftPersistence<TContext>({
  workspaceId,
  currentStepId,
  context,
  enabled,
  debounceMs = 800,
}: UseDraftPersistenceOptions<TContext>): UseDraftPersistenceResult<TContext> {
  const [pendingDraft, setPendingDraft] =
    useState<DraftEnvelope<TContext> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedForDraft = useRef(false);

  // On mount: check once for a restorable draft. We don't auto-apply it —
  // the caller (WizardContainer) decides how to surface the "restore?" prompt.
  useEffect(() => {
    if (hasCheckedForDraft.current) return;
    hasCheckedForDraft.current = true;

    let cancelled = false;
    loadDraft<TContext>(workspaceId).then((draft) => {
      if (!cancelled && draft) setPendingDraft(draft);
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Debounced autosave whenever context/step changes.
  useEffect(() => {
    if (!enabled) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setIsSaving(true);
      saveDraft(workspaceId, currentStepId, context).finally(() =>
        setIsSaving(false),
      );
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [workspaceId, currentStepId, context, enabled, debounceMs]);

  const restoreDraft = useCallback(() => {
    setPendingDraft(null);
    return pendingDraft;
  }, [pendingDraft]);

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
    clearDraft(workspaceId);
  }, [workspaceId]);

  const clearSavedDraft = useCallback(() => {
    clearDraft(workspaceId);
  }, [workspaceId]);

  return {
    pendingDraft,
    restoreDraft,
    dismissDraft,
    clearSavedDraft,
    isSaving,
  };
}

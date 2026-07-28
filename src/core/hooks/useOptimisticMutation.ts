"use client";

import { useCallback, useRef, useState } from "react";

/**
 * useOptimisticMutation
 * ---------------------------------------------------------------------------
 * Generic optimistic-update engine with automatic rollback.
 *
 * Deliberately agnostic of *what* state it manages - it doesn't know about
 * nodes, clusters, or CPU limits. It only knows how to:
 *   1. Snapshot state before a mutation (deep clone)
 *   2. Apply an optimistic change immediately
 *   3. Confirm on success, or restore the exact snapshot on failure/timeout
 *
 * The caller owns the actual state (e.g. a map of node -> NodeState) and
 * passes it in along with a setState-style updater. This keeps the hook
 * reusable across every control action in the dashboard.
 * ---------------------------------------------------------------------------
 */

export interface MutationResponse {
  ok: boolean;
  status?: number;
}

export interface MutationError {
  id: string;
  message: string;
  status?: number;
}

export interface MutateParams<TState> {
  /** Unique key for this in-flight action, e.g. `${nodeId}:restart`. */
  id: string;
  /** Pure function describing the optimistic change. */
  optimisticUpdate: (prev: TState) => TState;
  /** The actual network call. Must resolve to { ok, status }. */
  request: () => Promise<MutationResponse>;
  /** Defaults to 8000ms - triggers rollback if exceeded. */
  timeoutMs?: number;
  onSuccess?: (state: TState) => void;
  onError?: (error: MutationError, rolledBackState: TState) => void;
}

export interface UseOptimisticMutationResult<TState> {
  mutate: (params: MutateParams<TState>) => Promise<void>;
  pendingIds: Set<string>;
  isPending: (id: string) => boolean;
  lastError: MutationError | null;
}

interface MutationRecord<TState> {
  generation: number;
  snapshot: TState;
}

const DEFAULT_TIMEOUT_MS = 8000;

function cloneState<T>(value: T): T {
  // structuredClone handles nested objects/arrays/Maps/Sets correctly,
  // unlike a shallow spread - required per the engineering note about
  // snapshotting deep clones before applying optimistic diffs.
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  // Fallback for environments without structuredClone.
  return JSON.parse(JSON.stringify(value));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Request timed out"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function useOptimisticMutation<TState>(
  state: TState,
  setState: (updater: (prev: TState) => TState) => void,
): UseOptimisticMutationResult<TState> {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<MutationError | null>(null);

  // Always-current state snapshot source, read inside async callbacks
  // without depending on `state` and risking a stale closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  const recordsRef = useRef<Map<string, MutationRecord<TState>>>(new Map());

  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const mutate = useCallback(
    async ({
      id,
      optimisticUpdate,
      request,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      onSuccess,
      onError,
    }: MutateParams<TState>) => {
      // Ignore a duplicate dispatch for the same id while one is already
      // in-flight (e.g. a double-click on "Restart Node").
      if (recordsRef.current.has(id)) return;

      const snapshot = cloneState(stateRef.current);
      const generation = 1;
      recordsRef.current.set(id, { generation, snapshot });

      markPending(id, true);
      setState((prev) => optimisticUpdate(prev));

      try {
        const response = await withTimeout(request(), timeoutMs);

        const record = recordsRef.current.get(id);
        if (!record || record.generation !== generation) return; // superseded

        if (!response.ok) {
          throw Object.assign(new Error("Request rejected by server"), {
            status: response.status,
          });
        }

        recordsRef.current.delete(id);
        markPending(id, false);
        onSuccess?.(stateRef.current);
      } catch (err) {
        const record = recordsRef.current.get(id);
        if (!record || record.generation !== generation) return; // superseded

        // Roll back to the exact pre-mutation snapshot.
        setState(() => record.snapshot);
        recordsRef.current.delete(id);
        markPending(id, false);

        const mutationError: MutationError = {
          id,
          message:
            err instanceof Error ? err.message : "Mutation failed unexpectedly",
          status:
            typeof err === "object" && err !== null && "status" in err
              ? (err as { status?: number }).status
              : undefined,
        };
        setLastError(mutationError);
        onError?.(mutationError, record.snapshot);
      }
    },
    [markPending, setState],
  );

  const isPending = useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds],
  );

  return { mutate, pendingIds, isPending, lastError };
}

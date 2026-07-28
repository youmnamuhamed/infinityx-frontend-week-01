"use client";

import React from "react";
import { logError } from "@/core/telemetry/errorLogger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GranularErrorBoundaryProps {
  /** Human-readable widget identifier, shown in the fallback UI and sent to telemetry. */
  name: string;
  children: React.ReactNode;
  /**
   * When any value in this array changes (by reference/value, shallow-compared),
   * the boundary automatically resets — e.g. pass [workspaceId] so navigating to
   * a different workspace doesn't leave a dead widget behind.
   */
  resetKeys?: ReadonlyArray<unknown>;
  /** Optional custom fallback renderer. Receives the error and a manual retry callback. */
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
  /** Called once per catch, before auto-retry logic runs. Wire this to telemetry. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Delay before the single automatic retry attempt. Defaults to 2000ms. */
  autoRetryDelayMs?: number;
}

interface GranularErrorBoundaryState {
  error: Error | null;
  /** True once we've already used our one auto-retry attempt for the current error. */
  hasAutoRetried: boolean;
}

// ---------------------------------------------------------------------------
// Level 3: Component-level granular boundary
// ---------------------------------------------------------------------------

export class GranularErrorBoundary extends React.Component<
  GranularErrorBoundaryProps,
  GranularErrorBoundaryState
> {
  private autoRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  // Snapshot of resetKeys taken at the moment we caught the current error.
  // Only meaningful while this.state.error is non-null. We compare future
  // prop updates against THIS baseline rather than React's own prevProps,
  // because on the very render where the error is caught, prevProps is
  // already stale relative to the update that caused the crash — comparing
  // against it would make the boundary reset itself in the same commit it
  // just caught the error in, and the fallback UI would never be visible.
  private resetKeysAtError: ReadonlyArray<unknown> | null = null;

  constructor(props: GranularErrorBoundaryProps) {
    super(props);
    this.state = { error: null, hasAutoRetried: false };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<GranularErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Baseline the resetKeys as of the render that caused the crash.
    this.resetKeysAtError = this.props.resetKeys ?? [];

    logError(error, "component", this.props.name);
    this.props.onError?.(error, errorInfo);

    if (!this.state.hasAutoRetried) {
      const delay = this.props.autoRetryDelayMs ?? 2000;
      this.autoRetryTimeout = setTimeout(() => {
        this.reset(true);
      }, delay);
    }
  }

  componentDidUpdate(): void {
    if (!this.state.error || !this.resetKeysAtError) return;
    const baseline = this.resetKeysAtError;
    const nextKeys = this.props.resetKeys ?? [];
    const changed =
      baseline.length !== nextKeys.length ||
      baseline.some((key, i) => !Object.is(key, nextKeys[i]));
    if (changed) {
      this.reset(false);
    }
  }

  componentWillUnmount(): void {
    if (this.autoRetryTimeout) clearTimeout(this.autoRetryTimeout);
  }

  private reset = (viaAutoRetry: boolean): void => {
    if (this.autoRetryTimeout) {
      clearTimeout(this.autoRetryTimeout);
      this.autoRetryTimeout = null;
    }
    this.resetKeysAtError = null;
    this.setState({ error: null, hasAutoRetried: viaAutoRetry ? true : false });
  };

  /** Manual retry — always available immediately, regardless of auto-retry state. */
  private handleManualRetry = (): void => {
    this.reset(this.state.hasAutoRetried);
  };

  render(): React.ReactNode {
    const { error } = this.state;
    const { children, name, fallback } = this.props;

    if (!error) return children;

    if (fallback) return fallback(error, this.handleManualRetry);

    return (
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-danger" aria-hidden="true">
            ⚠
          </span>
          <span className="font-medium text-fg">{name} failed to load</span>
        </div>
        <p className="text-fg-muted">
          This widget hit an error and has been isolated so the rest of the
          dashboard keeps working.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="max-h-32 overflow-auto rounded bg-surface p-2 text-xs text-fg-muted">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={this.handleManualRetry}
          className="mt-1 w-fit rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          Retry Widget
        </button>
      </div>
    );
  }
}

// ---------------------------------------------------------------------------
// Functional escape hatch: useErrorBoundary
//
// Error boundaries only catch render-phase errors. Errors thrown inside event
// handlers or async callbacks (e.g. a rejected fetch inside a widget) never
// reach componentDidCatch on their own. This hook lets a function component
// hand such an error to its nearest GranularErrorBoundary by re-throwing it
// during the next render.
// ---------------------------------------------------------------------------

export function useErrorBoundary(): {
  showBoundary: (error: unknown) => void;
  resetBoundary: () => void;
} {
  const [error, setError] = React.useState<unknown>(null);

  if (error !== null) {
    // Thrown during render, where the nearest GranularErrorBoundary can see it.
    throw error instanceof Error ? error : new Error(String(error));
  }

  return {
    showBoundary: (err: unknown) => setError(err),
    resetBoundary: () => setError(null),
  };
}

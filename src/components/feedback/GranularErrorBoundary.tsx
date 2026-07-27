"use client";

import React from "react";

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
    // TODO: replace with errorLogger.logError() once src/core/telemetry/errorLogger.ts
    // exists (next deliverable). Keep this call site stable — only the body changes.
    console.error(
      `[GranularErrorBoundary:${this.props.name}]`,
      error,
      errorInfo,
    );
    this.props.onError?.(error, errorInfo);

    if (!this.state.hasAutoRetried) {
      const delay = this.props.autoRetryDelayMs ?? 2000;
      this.autoRetryTimeout = setTimeout(() => {
        this.reset(true);
      }, delay);
    }
  }

  componentDidUpdate(prevProps: GranularErrorBoundaryProps): void {
    if (!this.state.error) return;
    const prevKeys = prevProps.resetKeys ?? [];
    const nextKeys = this.props.resetKeys ?? [];
    const changed =
      prevKeys.length !== nextKeys.length ||
      prevKeys.some((key, i) => !Object.is(key, nextKeys[i]));
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

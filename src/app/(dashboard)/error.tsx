"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logError } from "@/core/telemetry/errorLogger";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Level 2: Feature/Route boundary
//
// Next.js renders this automatically for any uncaught error thrown during
// render within this route segment (and its children) that isn't already
// caught by a nested GranularErrorBoundary. It replaces just the segment's
// content — sibling route segments and the root layout stay mounted.
// ---------------------------------------------------------------------------

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps): React.ReactElement {
  useEffect(() => {
    logError(error, "route", window.location.pathname);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-3xl text-danger" aria-hidden="true">
        ⚠
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">
          Something went wrong in this section
        </h2>
        <p className="max-w-md text-sm text-fg-muted">
          The rest of the portal is unaffected. You can retry this section or
          head back to the dashboard.
        </p>
        {error.digest && (
          <p className="pt-1 text-xs text-fg-muted">
            Reference ID:{" "}
            <code className="rounded bg-surface px-1 py-0.5">
              {error.digest}
            </code>
          </p>
        )}
      </div>

      {process.env.NODE_ENV === "development" && (
        <pre className="max-h-40 max-w-lg overflow-auto rounded bg-surface p-3 text-left text-xs text-fg-muted">
          {error.message}
        </pre>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
        >
          Try Again
        </button>
        <Link
          href="/workspaces"
          className="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

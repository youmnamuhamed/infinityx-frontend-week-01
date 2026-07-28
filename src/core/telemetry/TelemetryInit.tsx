"use client";

import { useEffect } from "react";
import { initErrorLogger } from "./errorLogger";

/**
 * Mounts once in the root layout to attach window-level error/rejection
 * listeners. Kept as its own client component so RootLayout can stay a
 * Server Component (required for the `metadata` export). Renders nothing.
 */
export function TelemetryInit(): null {
  useEffect(() => {
    const cleanup = initErrorLogger();
    return cleanup;
  }, []);

  return null;
}

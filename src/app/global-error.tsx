"use client";

import { useEffect } from "react";
import { logError } from "@/core/telemetry/errorLogger";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Level 1: Root boundary
//
// Next.js only invokes this when an error escapes EVERY other boundary,
// including the root layout.tsx itself. Because it replaces the root layout,
// it must render its own <html>/<body> — the normal globals.css import and
// any providers from layout.tsx are not guaranteed to be mounted. Styling is
// inlined so this still renders correctly even in a total-failure state.
//
// Swap the hex values below for your actual --ix-* token values if you want
// pixel-exact parity with the rest of the app.
// ---------------------------------------------------------------------------

const colors = {
  bg: "#0b0e14",
  surface: "#141924",
  border: "#242b3a",
  fg: "#e6e9ef",
  fgMuted: "#8b93a7",
  danger: "#f0555a",
  accent: "#4f8cff",
};

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps): React.ReactElement {
  useEffect(() => {
    logError(error, "critical", "global-error");
  }, [error]);

  const handleHardReset = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // storage may be unavailable (private mode, permissions) — ignore
    }
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => keys.forEach((key) => caches.delete(key)))
        .catch(() => {
          // best-effort cache clear; ignore failures
        });
    }
    window.location.reload();
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bg,
          color: colors.fg,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }} aria-hidden="true">
            ⚠
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
            The application hit an unrecoverable error
          </h1>
          <p
            style={{
              fontSize: 14,
              color: colors.fgMuted,
              margin: "0 0 20px",
              lineHeight: 1.5,
            }}
          >
            This isn&apos;t your fault. Try recovering below, or reload with a
            full reset if the problem persists.
          </p>

          {error.digest && (
            <p
              style={{ fontSize: 12, color: colors.fgMuted, marginBottom: 16 }}
            >
              Reference ID:{" "}
              <code
                style={{
                  backgroundColor: colors.surface,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {error.digest}
              </code>
            </p>
          )}

          {process.env.NODE_ENV === "development" && (
            <pre
              style={{
                textAlign: "left",
                fontSize: 12,
                color: colors.fgMuted,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 12,
                maxHeight: 160,
                overflow: "auto",
                marginBottom: 20,
              }}
            >
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: `1px solid ${colors.accent}66`,
                backgroundColor: `${colors.accent}1a`,
                color: colors.accent,
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try to Recover
            </button>
            <button
              type="button"
              onClick={handleHardReset}
              style={{
                border: `1px solid ${colors.danger}66`,
                backgroundColor: `${colors.danger}1a`,
                color: colors.danger,
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Hard Reset
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

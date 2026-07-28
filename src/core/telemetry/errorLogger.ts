// ---------------------------------------------------------------------------
// Client Telemetry & Exception Aggregator
//
// Two ways this module is used:
//  1. Global capture: initErrorLogger() attaches window-level listeners for
//     unhandledrejection / error events that no React error boundary can see
//     (e.g. errors thrown outside a render/commit cycle entirely).
//  2. Direct calls: each tier of the boundary tree (Granular / Route /
//     Global) calls logError() explicitly from componentDidCatch / useEffect,
//     tagged with a severity matching its tier.
// ---------------------------------------------------------------------------

export type ErrorSeverity = "component" | "route" | "critical";

export interface ErrorPayload {
  message: string;
  stack?: string;
  route: string;
  severity: ErrorSeverity;
  /** Widget name (component tier) or route segment (route/critical tiers). */
  source: string;
  timestamp: string;
  digest?: string;
  sessionSnapshot: Record<string, unknown>;
  browser: {
    userAgent: string;
    language: string;
    platform: string;
    viewport: { width: number; height: number };
    online: boolean;
    connectionType?: string;
  };
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// ---------------------------------------------------------------------------
// Rate limiting: max 5 dispatches per rolling 30s window
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 30_000;
let dispatchTimestamps: number[] = [];
let hasWarnedAboutRateLimit = false;

function isRateLimited(): boolean {
  const now = Date.now();
  dispatchTimestamps = dispatchTimestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  if (dispatchTimestamps.length >= RATE_LIMIT_MAX) {
    if (!hasWarnedAboutRateLimit) {
      console.warn(
        "[errorLogger] Rate limit hit — suppressing further telemetry dispatches for 30s to avoid log flooding.",
      );
      hasWarnedAboutRateLimit = true;
      setTimeout(() => {
        hasWarnedAboutRateLimit = false;
      }, RATE_LIMIT_WINDOW_MS);
    }
    return true;
  }
  dispatchTimestamps.push(now);
  return false;
}

// ---------------------------------------------------------------------------
// PII sanitization
// ---------------------------------------------------------------------------

const SENSITIVE_KEY_PATTERN =
  /password|token|secret|authorization|api[_-]?key|ssn|cookie|credit[_-]?card|cvv/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[REDACTED]"
      : sanitize(val, depth + 1);
  }
  return result;
}

function getSanitizedSessionSnapshot(): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      const raw = sessionStorage.getItem(key);
      try {
        snapshot[key] = sanitize(raw ? JSON.parse(raw) : raw);
      } catch {
        snapshot[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : raw;
      }
    }
  } catch {
    // sessionStorage may be unavailable (private mode, permissions)
  }
  return snapshot;
}

// ---------------------------------------------------------------------------
// Payload construction
// ---------------------------------------------------------------------------

interface NavigatorConnection {
  effectiveType?: string;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function buildPayload(
  error: Error & { digest?: string },
  severity: ErrorSeverity,
  source: string,
): ErrorPayload {
  const nav = navigator as Navigator & { connection?: NavigatorConnection };
  const perf = performance as Performance & { memory?: PerformanceMemory };

  return {
    message: error.message,
    stack: error.stack,
    route: window.location.pathname,
    severity,
    source,
    timestamp: new Date().toISOString(),
    digest: error.digest,
    sessionSnapshot: getSanitizedSessionSnapshot(),
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      online: navigator.onLine,
      connectionType: nav.connection?.effectiveType,
    },
    memory: perf.memory
      ? {
          usedJSHeapSize: perf.memory.usedJSHeapSize,
          totalJSHeapSize: perf.memory.totalJSHeapSize,
          jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

// TODO: point this at your real telemetry ingestion endpoint once one exists.
const TELEMETRY_ENDPOINT = "/api/telemetry/errors";

function dispatch(payload: ErrorPayload): void {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
    if (sent) return;
  }

  // Fallback: keepalive fetch survives the page unloading mid-request.
  fetch(TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Telemetry is best-effort — never let a failed dispatch throw.
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function logError(
  error: Error & { digest?: string },
  severity: ErrorSeverity,
  source: string,
): void {
  if (isRateLimited()) return;
  const payload = buildPayload(error, severity, source);
  dispatch(payload);
  if (process.env.NODE_ENV === "development") {
    console.error(`[errorLogger:${severity}:${source}]`, payload);
  }
}

let listenersAttached = false;

/** Call once, e.g. in a useEffect in the root layout, to catch errors no boundary sees. */
export function initErrorLogger(): () => void {
  if (listenersAttached || typeof window === "undefined") {
    return () => {};
  }
  listenersAttached = true;

  const handleError = (event: ErrorEvent): void => {
    logError(
      event.error instanceof Error ? event.error : new Error(event.message),
      "critical",
      "window.onerror",
    );
  };

  const handleRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logError(error, "critical", "unhandledrejection");
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
    listenersAttached = false;
  };
}

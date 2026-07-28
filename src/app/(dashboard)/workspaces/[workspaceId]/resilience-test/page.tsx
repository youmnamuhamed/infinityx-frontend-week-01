"use client";

import { lazy, Suspense, use, useRef, useState } from "react";
import { GranularErrorBoundary } from "@/components/feedback/GranularErrorBoundary";

// ---------------------------------------------------------------------------
// Fault Injection Test Suite
//
// Each section below is deliberately isolated so you can verify the
// evaluation criteria from task-06 directly in the browser:
//
//  - Section A: three GranularErrorBoundary-wrapped widgets. Throwing in one
//    must NOT affect the other two, and must NOT reach the route or global
//    boundary. This is the core Level 3 isolation guarantee.
//  - Section B: a simulated ChunkLoadError via React.lazy, also isolated
//    inside a GranularErrorBoundary + Suspense.
//  - Section C: a deliberately UNWRAPPED widget. Throwing here has nothing
//    local to catch it, so it should bubble up and be caught by
//    (dashboard)/error.tsx — proving Level 2 catches what Level 3 doesn't.
//  - Section D: a floating (uncaught) promise rejection. React error
//    boundaries cannot catch promise rejections at all — this section exists
//    to prove errorLogger's global `unhandledrejection` listener fires
//    independently of the boundary tree.
//  - Section E: a high-CLS layout shift, for visual inspection / Lighthouse /
//    the webVitals module once it's built.
// ---------------------------------------------------------------------------

// Adjust to `{ params: { workspaceId: string } }` if your Next.js version
// still passes dynamic params synchronously rather than as a Promise.
interface ResilienceTestPageProps {
  params: Promise<{ workspaceId: string }>;
}

// --- Section A: Granular (Level 3) isolation -------------------------------

function ThrowingWidget({
  label,
  shouldThrow,
  markThrown,
}: {
  label: string;
  shouldThrow: boolean;
  markThrown: () => void;
}): React.ReactElement {
  if (shouldThrow) {
    // Marked BEFORE throwing so the next render (auto-retry or manual
    // "Retry Widget") sees shouldThrow=false and actually recovers, instead
    // of re-throwing forever. A ref mutation during render is unusual but
    // safe here — it's idempotent and only used to demo one-shot crashes.
    markThrown();
    const nullRef: { value: string } | null = null;
    // Intentional null pointer dereference — mirrors a real "Cannot read
    // properties of null" runtime exception.
    return <span>{nullRef!.value}</span>;
  }
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-4 text-sm text-fg">
      {label} — rendering normally
    </div>
  );
}

function GranularIsolationSection(): React.ReactElement {
  const [throwingId, setThrowingId] = useState<string | null>(null);
  const consumedRef = useRef<Set<string>>(new Set());
  const widgets = ["Widget A", "Widget B", "Widget C"];

  const handleCrash = (label: string): void => {
    consumedRef.current.delete(label); // allow this widget to throw again
    setThrowingId(label);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-fg">
        A. Granular (Level 3) Isolation
      </h2>
      <p className="text-sm text-fg-muted">
        Crash one widget and confirm the other two keep rendering untouched.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {widgets.map((label) => {
          const shouldThrow =
            throwingId === label && !consumedRef.current.has(label);
          return (
            <div key={label} className="space-y-2">
              <GranularErrorBoundary
                name={label}
                resetKeys={[throwingId]}
                autoRetryDelayMs={30000}
              >
                <ThrowingWidget
                  label={label}
                  shouldThrow={shouldThrow}
                  markThrown={() => consumedRef.current.add(label)}
                />
              </GranularErrorBoundary>
              <button
                type="button"
                onClick={() => handleCrash(label)}
                className="w-full rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
              >
                Crash {label}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// --- Section B: Simulated chunk load failure --------------------------------

function createBrokenLazyImport(): Promise<{ default: React.ComponentType }> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error(
        "Loading chunk 42 failed.\n(missing: /_next/static/chunks/42.9f3ab12.js)",
      );
      err.name = "ChunkLoadError";
      reject(err);
    }, 300);
  });
}

function ChunkLoadSection(): React.ReactElement {
  const [attempt, setAttempt] = useState(0);
  const [BrokenComponent, setBrokenComponent] =
    useState<React.LazyExoticComponent<React.ComponentType> | null>(null);

  const trigger = (): void => {
    setAttempt((n) => n + 1);
    setBrokenComponent(() => lazy(createBrokenLazyImport));
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-fg">
        B. Simulated Chunk Load Failure
      </h2>
      <p className="text-sm text-fg-muted">
        Mimics a stale-deployment scenario where a dynamically imported bundle
        404s.
      </p>
      <GranularErrorBoundary name="Chunk Loader" resetKeys={[attempt]}>
        <Suspense
          fallback={
            <div className="rounded-md border border-border-subtle bg-surface p-4 text-sm text-fg-muted">
              Loading chunk…
            </div>
          }
        >
          {BrokenComponent && <BrokenComponent />}
        </Suspense>
      </GranularErrorBoundary>
      <button
        type="button"
        onClick={trigger}
        className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
      >
        Trigger Chunk Load Failure
      </button>
    </section>
  );
}

// --- Section C: Unwrapped widget — should escalate to Level 2 --------------

function UnwrappedCrashSection(): React.ReactElement {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error(
      "Simulated uncaught render error — intentionally NOT wrapped in a GranularErrorBoundary.",
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-fg">
        C. Unwrapped Crash (expects Level 2 to catch it)
      </h2>
      <p className="text-sm text-fg-muted">
        This section has no local boundary. Clicking the button should replace
        this whole route&apos;s content with{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-xs">
          (dashboard)/error.tsx
        </code>{" "}
        — while the rest of the app (sidebar, other routes) stays alive.
      </p>
      <button
        type="button"
        onClick={() => setShouldThrow(true)}
        className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
      >
        Crash This Route (uncaught)
      </button>
    </section>
  );
}

// --- Section D: Floating promise rejection — global listener only ----------

function UnhandledRejectionSection(): React.ReactElement {
  const trigger = (): void => {
    // Intentionally not awaited/caught — React error boundaries cannot see
    // this. Only errorLogger's window `unhandledrejection` listener will.
    Promise.reject(
      new Error(
        "Simulated unhandled promise rejection from resilience-test page",
      ),
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-fg">
        D. Unhandled Promise Rejection (telemetry-only)
      </h2>
      <p className="text-sm text-fg-muted">
        No boundary will visibly react to this — check the console (dev mode) or
        your telemetry endpoint for a{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-xs">
          severity: &quot;critical&quot;, source: &quot;unhandledrejection&quot;
        </code>{" "}
        payload.
      </p>
      <button
        type="button"
        onClick={trigger}
        className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
      >
        Fire Unhandled Rejection
      </button>
    </section>
  );
}

// --- Section E: High CLS layout shift ---------------------------------------

function CLSSection(): React.ReactElement {
  const [showLateBanner, setShowLateBanner] = useState(false);

  const trigger = (): void => {
    setShowLateBanner(false);
    setTimeout(() => setShowLateBanner(true), 1200);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-fg">
        E. High CLS Layout Shift
      </h2>
      <p className="text-sm text-fg-muted">
        Injects an unreserved-space banner ~1.2s after content settles. Inspect
        via Chrome DevTools Performance panel or Lighthouse — once webVitals.ts
        is built, it&apos;ll flag this automatically (CLS &gt; 0.05 threshold).
      </p>
      {showLateBanner && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Late-arriving content with no reserved space — this is the layout
          shift.
        </div>
      )}
      <div className="rounded-md border border-border-subtle bg-surface p-4 text-sm text-fg-muted">
        Stable content below the trigger button.
      </div>
      <button
        type="button"
        onClick={trigger}
        className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
      >
        Trigger Layout Shift
      </button>
    </section>
  );
}

// --- Page --------------------------------------------------------------------

export default function ResilienceTestPage({
  params,
}: ResilienceTestPageProps): React.ReactElement {
  const { workspaceId } = use(params);

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">
          Resilience &amp; Fault Injection Test Suite
        </h1>
        <p className="text-sm text-fg-muted">
          Workspace:{" "}
          <code className="rounded bg-surface px-1 py-0.5">{workspaceId}</code>
        </p>
      </div>

      <GranularIsolationSection />
      <ChunkLoadSection />
      <UnwrappedCrashSection />
      <UnhandledRejectionSection />
      <CLSSection />
    </div>
  );
}

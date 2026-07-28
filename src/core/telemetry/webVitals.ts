// ---------------------------------------------------------------------------
// Core Web Vitals Monitor
//
// Implemented directly against the native PerformanceObserver / Performance
// Timeline APIs rather than a third-party library, per task-06's requirement
// to track "according to official W3C Performance Observer APIs."
//
// Note on INP: the official algorithm takes the 98th percentile duration
// across all page interactions. This is approximated here from observed
// Event Timing entries. For pixel-exact spec compliance in production,
// consider the `web-vitals` npm package, which handles browser edge cases
// (bfcache restores, cross-tab visibility races) this implementation does not.
// ---------------------------------------------------------------------------

export type VitalName = "LCP" | "INP" | "CLS" | "TTFB" | "FCP";
export type VitalRating = "good" | "needs-improvement" | "poor";

export interface CulpritInfo {
  selector: string;
  contribution: number;
}

export interface VitalMetric {
  name: VitalName;
  value: number;
  rating: VitalRating;
  route: string;
  timestamp: string;
  culprits?: CulpritInfo[];
}

type VitalReporter = (metric: VitalMetric) => void;

// Official Core Web Vitals good/poor boundaries (web.dev, 2024 revision).
const THRESHOLDS: Record<VitalName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
};

// Internal early-warning thresholds from task-06 — stricter than "good",
// meant to catch regressions before they cross the official boundary above.
const CULPRIT_FLAG_THRESHOLDS: Partial<Record<VitalName, number>> = {
  CLS: 0.05,
  INP: 150,
};

function getRating(name: VitalName, value: number): VitalRating {
  const t = THRESHOLDS[name];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function describeElement(node: Node | null | undefined): string {
  if (!node || !(node instanceof Element)) return "unknown";
  const id = node.id ? `#${node.id}` : "";
  const classes =
    typeof node.className === "string" && node.className.trim()
      ? `.${node.className.trim().split(/\s+/).join(".")}`
      : "";
  return `${node.tagName.toLowerCase()}${id}${classes}`;
}

const RATING_COLORS: Record<VitalRating, string> = {
  good: "#3ecf8e",
  "needs-improvement": "#f0b429",
  poor: "#f0555a",
};

function logToConsole(metric: VitalMetric): void {
  if (process.env.NODE_ENV !== "development") return;
  const color = RATING_COLORS[metric.rating];
  const unit = metric.name === "CLS" ? "" : "ms";
  console.log(
    `%c[WebVitals] ${metric.name}: ${metric.value.toFixed(2)}${unit} — ${metric.rating}`,
    `color: ${color}; font-weight: bold;`,
  );

  const flagThreshold = CULPRIT_FLAG_THRESHOLDS[metric.name];
  if (flagThreshold !== undefined && metric.value > flagThreshold) {
    console.warn(
      `[WebVitals] ${metric.name} exceeded internal threshold (${flagThreshold}${unit}).`,
      metric.culprits ?? "No culprit data captured.",
    );
  }
}

let onReport: VitalReporter = () => {};

/** Pluggable sink for reporting vitals somewhere other than the console (e.g. a beacon dispatch). */
export function setVitalsReporter(fn: VitalReporter): void {
  onReport = fn;
}

function report(
  name: VitalName,
  value: number,
  culprits?: CulpritInfo[],
): void {
  const metric: VitalMetric = {
    name,
    value,
    rating: getRating(name, value),
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
    culprits,
  };
  logToConsole(metric);
  onReport(metric);
}

// ---------------------------------------------------------------------------
// TTFB — Navigation Timing API
// ---------------------------------------------------------------------------

function observeTTFB(): void {
  const [nav] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  if (nav) report("TTFB", nav.responseStart);
}

// ---------------------------------------------------------------------------
// FCP — Paint Timing API
// ---------------------------------------------------------------------------

function observeFCP(): void {
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          report("FCP", entry.startTime);
          po.disconnect();
        }
      }
    });
    po.observe({ type: "paint", buffered: true });
  } catch {
    // Paint Timing unsupported in this browser
  }
}

// ---------------------------------------------------------------------------
// LCP — finalized on first user input or tab hide, per spec (LCP candidates
// stop being considered once the user has interacted with the page).
// ---------------------------------------------------------------------------

function observeLCP(): void {
  try {
    let latestValue = 0;
    let finalized = false;

    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) latestValue = last.startTime;
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });

    const finalize = (): void => {
      if (finalized) return;
      finalized = true;
      if (latestValue > 0) report("LCP", latestValue);
      po.disconnect();
    };

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") finalize();
      },
      { once: true },
    );
    (["keydown", "click"] as const).forEach((type) =>
      window.addEventListener(type, finalize, { once: true, capture: true }),
    );
  } catch {
    // largest-contentful-paint unsupported in this browser
  }
}

// ---------------------------------------------------------------------------
// CLS — session-windowed accumulation per the official algorithm: group
// shift entries into sessions (gap < 1s between entries, span < 5s total),
// sum each session, report the worst session's total.
// ---------------------------------------------------------------------------

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: Array<{ node?: Node }>;
}

function observeCLS(): void {
  try {
    let sessionValue = 0;
    let sessionEntries: LayoutShiftEntry[] = [];
    let maxSessionValue = 0;
    let maxSessionEntries: LayoutShiftEntry[] = [];

    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (entry.hadRecentInput) continue;

        const first = sessionEntries[0];
        const last = sessionEntries[sessionEntries.length - 1];

        if (
          last &&
          first &&
          entry.startTime - last.startTime < 1000 &&
          entry.startTime - first.startTime < 5000
        ) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          sessionValue = entry.value;
          sessionEntries = [entry];
        }

        if (sessionValue > maxSessionValue) {
          maxSessionValue = sessionValue;
          maxSessionEntries = sessionEntries;
        }
      }
    });
    po.observe({ type: "layout-shift", buffered: true });

    const finalize = (): void => {
      if (maxSessionValue === 0) return;
      const culprits: CulpritInfo[] = maxSessionEntries
        .flatMap((e) => e.sources ?? [])
        .slice(0, 5)
        .map((s) => ({
          selector: describeElement(s.node),
          contribution: maxSessionValue,
        }));
      report("CLS", maxSessionValue, culprits.length ? culprits : undefined);
      po.disconnect();
    };

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") finalize();
      },
      { once: true },
    );
  } catch {
    // layout-shift unsupported in this browser (e.g. Safari)
  }
}

// ---------------------------------------------------------------------------
// INP — approximated from the Event Timing API. Tracks the worst duration
// per interactionId, then reports the ~98th-percentile duration across all
// tracked interactions when the page is hidden.
// ---------------------------------------------------------------------------

interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number;
  duration: number;
  target?: Node | null;
}

function observeINP(): void {
  try {
    const interactionMap = new Map<number, EventTimingEntry>();

    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as EventTimingEntry[]) {
        if (!entry.interactionId) continue;
        const existing = interactionMap.get(entry.interactionId);
        if (!existing || entry.duration > existing.duration) {
          interactionMap.set(entry.interactionId, entry);
        }
      }
    });
    po.observe({
      type: "event",
      buffered: true,
      durationThreshold: 40,
    } as PerformanceObserverInit);

    const finalize = (): void => {
      if (interactionMap.size === 0) return;
      const sorted = Array.from(interactionMap.values()).sort(
        (a, b) => a.duration - b.duration,
      );
      const index = Math.min(
        sorted.length - 1,
        Math.floor(sorted.length * 0.98),
      );
      const worst = sorted[index];
      report(
        "INP",
        worst.duration,
        worst.target
          ? [
              {
                selector: describeElement(worst.target),
                contribution: worst.duration,
              },
            ]
          : undefined,
      );
      po.disconnect();
    };

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "hidden") finalize();
      },
      { once: true },
    );
  } catch {
    // Event Timing API unsupported in this browser
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function initWebVitals(): void {
  if (typeof window === "undefined") return;
  observeTTFB();
  observeFCP();
  observeLCP();
  observeCLS();
  observeINP();
}

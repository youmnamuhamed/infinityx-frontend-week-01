"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface PerformanceMonitorOptions {
  /** Master on/off switch. Combined with a NODE_ENV check internally, so
   *  this can safely be left true without leaking into production. */
  enabled: boolean;
  /** How often (ms) to log a summary to console. Default 1000ms. */
  reportIntervalMs?: number;
  /** Number of recent frame samples to keep for the rolling window.
   *  Default 120 (~2s worth at 60fps). */
  sampleWindowSize?: number;
  /** Frame budget in ms below which a frame is considered "on budget".
   *  Default 16.6ms (60fps). */
  frameBudgetMs?: number;
  /** Optional label prefixed to console output, useful if multiple grids
   *  are monitored on the same page. */
  label?: string;
}

function computeStdDev(samples: number[], mean: number): number {
  if (samples.length === 0) return 0;
  const variance =
    samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / samples.length;
  return Math.sqrt(variance);
}

/**
 * Dev-only performance telemetry for scroll-heavy components. Attaches a
 * requestAnimationFrame loop (frame timing) to measure FPS and jitter, and
 * a scroll listener on the given element to correlate stats with active
 * scrolling. Logs a throttled, grouped summary to the console.
 *
 * No-op entirely when `enabled` is false or NODE_ENV !== "development" —
 * safe to leave wired up without any production cost.
 */
export function usePerformanceMonitor<T extends HTMLElement>(
  scrollElementRef: RefObject<T | null>,
  {
    enabled,
    reportIntervalMs = 1000,
    sampleWindowSize = 120,
    frameBudgetMs = 20,
    label = "DataGrid",
  }: PerformanceMonitorOptions,
): void {
  const isDev = process.env.NODE_ENV === "development";
  const active = enabled && isDev;

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastReportTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scrollEventCountRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const element = scrollElementRef.current;
    if (!element) return;

    const onScroll = (): void => {
      isScrollingRef.current = true;
      scrollEventCountRef.current += 1;
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      scrollEndTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };
    element.addEventListener("scroll", onScroll, { passive: true });

    const tick = (now: number): void => {
      if (lastFrameTimeRef.current !== null) {
        const delta = now - lastFrameTimeRef.current;
        const buffer = frameTimesRef.current;
        buffer.push(delta);
        if (buffer.length > sampleWindowSize) buffer.shift();
      }
      lastFrameTimeRef.current = now;

      if (now - lastReportTimeRef.current >= reportIntervalMs) {
        lastReportTimeRef.current = now;
        const samples = frameTimesRef.current;

        if (samples.length > 0 && isScrollingRef.current) {
          const avgFrameTime =
            samples.reduce((sum, v) => sum + v, 0) / samples.length;
          const fps = 1000 / avgFrameTime;
          const jitterMs = computeStdDev(samples, avgFrameTime);
          const maxFrameTime = Math.max(...samples);
          const overBudgetCount = samples.filter(
            (v) => v > frameBudgetMs,
          ).length;
          const overBudgetPct = (overBudgetCount / samples.length) * 100;

          const isHealthy = avgFrameTime <= frameBudgetMs && overBudgetPct < 25;
          const logFn = isHealthy ? console.log : console.warn;

          logFn(
            `%c[${label}] scroll perf — ${fps.toFixed(1)} fps avg, ` +
              `${avgFrameTime.toFixed(2)}ms/frame, ` +
              `jitter ±${jitterMs.toFixed(2)}ms, ` +
              `max ${maxFrameTime.toFixed(2)}ms, ` +
              `${overBudgetPct.toFixed(0)}% frames over ${frameBudgetMs}ms budget`,
            `color: ${isHealthy ? "#4caf50" : "#ff9800"}; font-weight: bold;`,
          );
        }
        scrollEventCountRef.current = 0;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      element.removeEventListener("scroll", onScroll);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      frameTimesRef.current = [];
      lastFrameTimeRef.current = null;
    };
    // scrollElementRef is a ref object (stable identity); its .current is
    // read inside the effect intentionally on every mount, not tracked
    // reactively — re-running this effect only when config actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reportIntervalMs, sampleWindowSize, frameBudgetMs, label]);
}

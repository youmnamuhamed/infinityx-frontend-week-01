"use client";

import { useId, useMemo } from "react";

/**
 * Sparkline
 * ---------------------------------------------------------------------------
 * Minimal, dependency-free SVG trend line for a series of numeric values.
 * Pure presentational primitive - no state, no data fetching, cheap to
 * re-render on every telemetry tick.
 *
 * Deliberately plain: a light gradient fill under a single stroked line.
 * No axes, no gridlines, no legend - this is a glanceable trend indicator
 * inside a dense node card, not a standalone chart.
 * ---------------------------------------------------------------------------
 */

export interface SparklineProps {
  /** Values oldest -> newest. */
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
  /** Fix the scale instead of auto-fitting to this series' min/max. */
  min?: number;
  max?: number;
  ariaLabel?: string;
}

export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "#5B8DEF",
  strokeWidth = 1.5,
  showArea = true,
  min,
  max,
  ariaLabel,
}: SparklineProps) {
  const gradientId = useId();

  const { linePath, areaPath, latest } = useMemo(() => {
    if (data.length === 0) {
      return { linePath: "", areaPath: "", latest: null as number | null };
    }

    const dataMin = min ?? Math.min(...data);
    const dataMax = max ?? Math.max(...data);
    const range = dataMax - dataMin || 1; // guard against divide-by-zero on flat series

    const stepX = data.length > 1 ? width / (data.length - 1) : width;

    const points = data.map((v, i) => {
      const x = i * stepX;
      const normalized = (v - dataMin) / range;
      const y = height - normalized * height;
      return [x, y] as const;
    });

    const line = points
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`,
      )
      .join(" ");

    const area =
      points.length > 0
        ? `${line} L${points[points.length - 1][0].toFixed(2)},${height} L0,${height} Z`
        : "";

    return { linePath: line, areaPath: area, latest: data[data.length - 1] };
  }, [data, width, height, min, max]);

  if (data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel ?? "No data yet"}
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#2A303C"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? `Trend, latest value ${latest?.toFixed(1)}`}
    >
      {showArea && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {showArea && (
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

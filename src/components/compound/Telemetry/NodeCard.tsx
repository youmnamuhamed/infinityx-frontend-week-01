"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import {
  Cpu,
  Gauge,
  MemoryStick,
  Network,
  RotateCw,
  Minus,
  Plus,
} from "lucide-react";
import { Sparkline } from "@/components/primitive/Sparkline";

/**
 * NodeCard
 * ---------------------------------------------------------------------------
 * Presentational compound component for a single infrastructure node.
 * Purely a function of its props - it does not call useTelemetryStream or
 * useOptimisticMutation itself. The dashboard page (Step 6) owns both hooks
 * and passes each card only its own slice of state, which is what makes
 * the React.memo wrapper below actually effective: unrelated node updates
 * never reach a card that isn't affected by them.
 *
 * Colors/spacing are pulled from the project's global design tokens
 * (--ix-*, defined in globals.css) via Tailwind arbitrary values, so this
 * card automatically matches the rest of the dashboard (sidebar, metric
 * cards, etc.) rather than using an invented palette.
 * ---------------------------------------------------------------------------
 */

export type NodeStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "restarting"
  | "offline";

export interface NodeMetrics {
  cpu: number; // percent
  memory: number; // percent
  latencyMs: number;
  connections: number;
}

export interface NodeMetricHistory {
  cpu: number[];
  memory: number[];
  latencyMs: number[];
  connections: number[];
}

export interface NodeCardProps {
  nodeId: string;
  nodeName: string;
  status: NodeStatus;
  cpuLimit: number; // percent cap, e.g. 80
  metrics: NodeMetrics;
  history: NodeMetricHistory;
  isRestartPending: boolean;
  isCpuLimitPending: boolean;
  onRestart: () => void;
  onCpuLimitChange: (nextLimit: number) => void;
}

interface StatusStyle {
  label: string;
  edge: string;
  dot: string;
  text: string;
}

const STATUS_STYLES: Record<NodeStatus, StatusStyle> = {
  healthy: {
    label: "Healthy",
    edge: "bg-(--ix-success)",
    dot: "bg-(--ix-success)",
    text: "text-(--ix-success)",
  },
  warning: {
    label: "Warning",
    edge: "bg-(--ix-warning)",
    dot: "bg-(--ix-warning)",
    text: "text-(--ix-warning)",
  },
  critical: {
    label: "Critical",
    edge: "bg-(--ix-danger)",
    dot: "bg-(--ix-danger)",
    text: "text-(--ix-danger)",
  },
  restarting: {
    label: "Restarting",
    edge: "bg-(--ix-accent)",
    dot: "bg-(--ix-accent)",
    text: "text-(--ix-accent)",
  },
  offline: {
    label: "Offline",
    edge: "bg-(--ix-text-muted)",
    dot: "bg-(--ix-text-muted)",
    text: "text-(--ix-text-muted)",
  },
};

const CPU_LIMIT_STEP = 5;
const CPU_LIMIT_MIN = 10;
const CPU_LIMIT_MAX = 100;

function MetricTile({
  icon,
  label,
  value,
  unit,
  data,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  data: number[];
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-(--ix-radius) border border-(--ix-border-subtle) bg-(--ix-surface-raised) px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-(--ix-text-muted)" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-(--ix-text-muted)">
            {label}
          </div>
          <div className="font-mono text-sm text-(--ix-text-primary) tabular-nums">
            {value.toFixed(1)}
            <span className="text-(--ix-text-muted)">{unit}</span>
          </div>
        </div>
      </div>
      <Sparkline
        data={data}
        width={72}
        height={24}
        color={color}
        ariaLabel={`${label} trend, currently ${value.toFixed(1)}${unit}`}
      />
    </div>
  );
}

function NodeCardImpl({
  nodeId,
  nodeName,
  status,
  cpuLimit,
  metrics,
  history,
  isRestartPending,
  isCpuLimitPending,
  onRestart,
  onCpuLimitChange,
}: NodeCardProps) {
  const statusStyle = STATUS_STYLES[status];
  const isAnyPending = isRestartPending || isCpuLimitPending;

  const handleCpuLimitStep = (delta: number) => {
    const next = Math.min(
      CPU_LIMIT_MAX,
      Math.max(CPU_LIMIT_MIN, cpuLimit + delta),
    );
    if (next !== cpuLimit) onCpuLimitChange(next);
  };

  return (
    <div
      className="relative overflow-hidden rounded-(--ix-radius) border border-(--ix-border) bg-(--ix-surface)"
      data-node-id={nodeId}
    >
      {/* Status edge - readable at a glance without reading any text */}
      <div className={`absolute inset-y-0 left-0 w-1 ${statusStyle.edge}`} />

      <div className="pl-4 pr-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-(--ix-text-primary)">
              {nodeName}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                aria-hidden="true"
              />
              <span className={statusStyle.text}>{statusStyle.label}</span>
            </div>
          </div>

          {/* Pending sync indicator - subtle pulse, not a spinner */}
          <div
            className="flex items-center gap-1.5 text-xs text-(--ix-accent)"
            aria-live="polite"
          >
            {isAnyPending && (
              <>
                <span
                  className="h-1.5 w-1.5 rounded-full bg-(--ix-accent) animate-pulse-soft motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span>Syncing…</span>
              </>
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricTile
            icon={<Cpu size={14} />}
            label="CPU"
            value={metrics.cpu}
            unit="%"
            data={history.cpu}
            color="var(--ix-accent)"
          />
          <MetricTile
            icon={<MemoryStick size={14} />}
            label="Memory"
            value={metrics.memory}
            unit="%"
            data={history.memory}
            color="var(--ix-success)"
          />
          <MetricTile
            icon={<Gauge size={14} />}
            label="Latency"
            value={metrics.latencyMs}
            unit="ms"
            data={history.latencyMs}
            color="var(--ix-warning)"
          />
          <MetricTile
            icon={<Network size={14} />}
            label="Connections"
            value={metrics.connections}
            unit=""
            data={history.connections}
            color="var(--ix-text-secondary)"
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-(--ix-border-subtle) pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-(--ix-text-muted)">
              CPU limit
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCpuLimitStep(-CPU_LIMIT_STEP)}
                disabled={isCpuLimitPending || cpuLimit <= CPU_LIMIT_MIN}
                aria-label={`Decrease CPU limit for ${nodeName}`}
                className="flex h-6 w-6 items-center justify-center rounded border border-(--ix-border) text-(--ix-text-muted) hover:text-(--ix-text-primary) hover:border-(--ix-accent) disabled:opacity-40 disabled:hover:text-(--ix-text-muted) disabled:hover:border-(--ix-border) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ix-accent)"
              >
                <Minus size={12} />
              </button>
              <span className="w-10 text-center font-mono text-sm tabular-nums text-(--ix-text-primary)">
                {cpuLimit}%
              </span>
              <button
                type="button"
                onClick={() => handleCpuLimitStep(CPU_LIMIT_STEP)}
                disabled={isCpuLimitPending || cpuLimit >= CPU_LIMIT_MAX}
                aria-label={`Increase CPU limit for ${nodeName}`}
                className="flex h-6 w-6 items-center justify-center rounded border border-(--ix-border) text-(--ix-text-muted) hover:text-(--ix-text-primary) hover:border-(--ix-accent) disabled:opacity-40 disabled:hover:text-(--ix-text-muted) disabled:hover:border-(--ix-border) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ix-accent)"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onRestart}
            disabled={isRestartPending || status === "offline"}
            className="flex items-center gap-1.5 rounded-(--ix-radius) border border-(--ix-border) px-2.5 py-1.5 text-xs font-medium text-(--ix-text-primary) hover:border-(--ix-accent) hover:bg-(--ix-surface-raised) disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-(--ix-border) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ix-accent)"
          >
            <RotateCw
              size={13}
              className={
                isRestartPending
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }
            />
            {isRestartPending ? "Restarting" : "Restart node"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Memoized: a node card only needs to re-render when its own props change.
// This is what keeps unrelated node updates from thrashing the whole grid.
export const NodeCard = memo(NodeCardImpl);

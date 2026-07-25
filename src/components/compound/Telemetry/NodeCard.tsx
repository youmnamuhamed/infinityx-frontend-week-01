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

const STATUS_STYLES: Record<
  NodeStatus,
  { label: string; edge: string; dot: string; text: string }
> = {
  healthy: {
    label: "Healthy",
    edge: "bg-[#3DD68C]",
    dot: "bg-[#3DD68C]",
    text: "text-[#3DD68C]",
  },
  warning: {
    label: "Warning",
    edge: "bg-[#E3A008]",
    dot: "bg-[#E3A008]",
    text: "text-[#E3A008]",
  },
  critical: {
    label: "Critical",
    edge: "bg-[#E5484D]",
    dot: "bg-[#E5484D]",
    text: "text-[#E5484D]",
  },
  restarting: {
    label: "Restarting",
    edge: "bg-[#5B8DEF]",
    dot: "bg-[#5B8DEF]",
    text: "text-[#5B8DEF]",
  },
  offline: {
    label: "Offline",
    edge: "bg-[#4B5563]",
    dot: "bg-[#4B5563]",
    text: "text-[#4B5563]",
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
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  data: number[];
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#242A33] bg-[#0E1116] px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[#8B93A1]" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-[#8B93A1]">
            {label}
          </div>
          <div className="font-mono text-sm text-[#E4E7EB] tabular-nums">
            {value.toFixed(1)}
            <span className="text-[#8B93A1]">{unit}</span>
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
      className="relative overflow-hidden rounded-lg border border-[#242A33] bg-[#12151A]"
      data-node-id={nodeId}
    >
      {/* Status edge - readable at a glance without reading any text */}
      <div className={`absolute inset-y-0 left-0 w-1 ${statusStyle.edge}`} />

      <div className="pl-4 pr-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-[#E4E7EB]">{nodeName}</h3>
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
            className="flex items-center gap-1.5 text-xs text-[#5B8DEF]"
            aria-live="polite"
          >
            {isAnyPending && (
              <>
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#5B8DEF] animate-pulse-soft motion-reduce:animate-none"
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
            color="#5B8DEF"
          />
          <MetricTile
            icon={<MemoryStick size={14} />}
            label="Memory"
            value={metrics.memory}
            unit="%"
            data={history.memory}
            color="#3DD68C"
          />
          <MetricTile
            icon={<Gauge size={14} />}
            label="Latency"
            value={metrics.latencyMs}
            unit="ms"
            data={history.latencyMs}
            color="#E3A008"
          />
          <MetricTile
            icon={<Network size={14} />}
            label="Connections"
            value={metrics.connections}
            unit=""
            data={history.connections}
            color="#8B93A1"
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#242A33] pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[#8B93A1]">
              CPU limit
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCpuLimitStep(-CPU_LIMIT_STEP)}
                disabled={isCpuLimitPending || cpuLimit <= CPU_LIMIT_MIN}
                aria-label={`Decrease CPU limit for ${nodeName}`}
                className="flex h-6 w-6 items-center justify-center rounded border border-[#242A33] text-[#8B93A1] hover:text-[#E4E7EB] hover:border-[#3A4250] disabled:opacity-40 disabled:hover:text-[#8B93A1] disabled:hover:border-[#242A33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8DEF]"
              >
                <Minus size={12} />
              </button>
              <span className="w-10 text-center font-mono text-sm tabular-nums text-[#E4E7EB]">
                {cpuLimit}%
              </span>
              <button
                type="button"
                onClick={() => handleCpuLimitStep(CPU_LIMIT_STEP)}
                disabled={isCpuLimitPending || cpuLimit >= CPU_LIMIT_MAX}
                aria-label={`Increase CPU limit for ${nodeName}`}
                className="flex h-6 w-6 items-center justify-center rounded border border-[#242A33] text-[#8B93A1] hover:text-[#E4E7EB] hover:border-[#3A4250] disabled:opacity-40 disabled:hover:text-[#8B93A1] disabled:hover:border-[#242A33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8DEF]"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onRestart}
            disabled={isRestartPending || status === "offline"}
            className="flex items-center gap-1.5 rounded-md border border-[#242A33] px-2.5 py-1.5 text-xs font-medium text-[#E4E7EB] hover:border-[#3A4250] hover:bg-[#181C22] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-[#242A33] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8DEF]"
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

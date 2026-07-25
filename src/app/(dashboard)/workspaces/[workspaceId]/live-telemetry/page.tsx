"use client";

/**
 * Live Telemetry Dashboard — integration page
 * ---------------------------------------------------------------------------
 * Target path in your project:
 *   src/app/(dashboard)/workspaces/[workspaceId]/live-telemetry/page.tsx
 *
 * This is the piece that wires everything else together:
 *   - useTelemetryStream   -> raw deduplicated event feed (flat, all nodes)
 *   - useOptimisticMutation -> restart / cpu-limit control actions
 *   - NodeCard             -> presentational grid, one per node
 *   - a Canvas-based aggregate chart, drawn imperatively (no re-render churn)
 *
 * Nothing here does more than one job:
 *   - `derivedNodes` is *read-only telemetry* (latest metrics + history),
 *     recomputed from `events` via useMemo. It is never mutated directly.
 *   - `controlState` is *user-controlled* state (cpu limit, restarting flag),
 *     owned by useOptimisticMutation with snapshot/rollback semantics.
 *   - NodeStatus is derived by combining the two, not stored anywhere.
 * ---------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Pause, Play, RefreshCw } from "lucide-react";
import {
  useTelemetryStream,
  type ConnectionState,
  type TelemetryEvent,
} from "@/core/hooks/useTelemetryStream";
import {
  useOptimisticMutation,
  type MutationResponse,
} from "@/core/hooks/useOptimisticMutation";
import {
  NodeCard,
  type NodeMetricHistory,
  type NodeStatus,
} from "@/components/compound/Telemetry/NodeCard";

const STREAM_URL = "/api/telemetry/stream";
const SPARKLINE_HISTORY_POINTS = 30;
const CHART_HISTORY_POINTS = 90;
const DEFAULT_CPU_LIMIT = 80;

// Thresholds for deriving a node's visual status from raw metrics.
// (No backend field for this yet — the stream only carries numbers.)
const CPU_CRITICAL = 90;
const CPU_WARNING = 75;
const LATENCY_CRITICAL_MS = 300;
const LATENCY_WARNING_MS = 150;

// -----------------------------------------------------------------------
// Control state: the part of the UI the *user* changes (not telemetry).
// Owned by useOptimisticMutation so restart/cpu-limit actions get
// snapshot + rollback for free.
// -----------------------------------------------------------------------
interface NodeControlState {
  cpuLimit: number;
  isRestarting: boolean;
}
type ControlStateMap = Record<string, NodeControlState>;

function getControl(map: ControlStateMap, nodeId: string): NodeControlState {
  return map[nodeId] ?? { cpuLimit: DEFAULT_CPU_LIMIT, isRestarting: false };
}

// Mock backend call: no real /api/nodes/:id/restart route exists yet, 
// so this simulates one — 20% random failure rate per
// Swap the body for a real fetch() once the backend route exists; the
// mutation engine doesn't care what `request` actually does.
function simulateNodeActionRequest(): Promise<MutationResponse> {
  return new Promise((resolve) => {
    const delay = 400 + Math.random() * 900;
    setTimeout(() => {
      const failed = Math.random() < 0.2;
      resolve(failed ? { ok: false, status: 500 } : { ok: true, status: 200 });
    }, delay);
  });
}

function formatNodeName(nodeId: string): string {
  return nodeId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveStatus(
  latest: TelemetryEvent["metrics"] | undefined,
  isRestarting: boolean,
): NodeStatus {
  if (isRestarting) return "restarting";
  if (!latest) return "offline";
  if (latest.cpu >= CPU_CRITICAL || latest.latencyMs >= LATENCY_CRITICAL_MS) {
    return "critical";
  }
  if (latest.cpu >= CPU_WARNING || latest.latencyMs >= LATENCY_WARNING_MS) {
    return "warning";
  }
  return "healthy";
}

interface DerivedNode {
  latest: TelemetryEvent["metrics"];
  history: NodeMetricHistory;
}

interface AggregatePoint {
  cpu: number;
  memory: number;
  latencyMs: number;
}

interface Toast {
  id: string;
  message: string;
}

const CONNECTION_STYLES: Record<
  ConnectionState,
  { label: string; dot: string; text: string }
> = {
  CONNECTING: {
    label: "Connecting…",
    dot: "bg-(--ix-accent)",
    text: "text-(--ix-accent)",
  },
  CONNECTED: {
    label: "Connected",
    dot: "bg-(--ix-success)",
    text: "text-(--ix-success)",
  },
  RECONNECTING: {
    label: "Reconnecting…",
    dot: "bg-(--ix-warning)",
    text: "text-(--ix-warning)",
  },
  DISCONNECTED: {
    label: "Disconnected",
    dot: "bg-(--ix-text-muted)",
    text: "text-(--ix-text-muted)",
  },
  ERROR: {
    label: "Connection lost",
    dot: "bg-(--ix-danger)",
    text: "text-(--ix-danger)",
  },
};

export default function LiveTelemetryPage() {
  const {
    status,
    events,
    retryCount,
    maxRetries,
    isPaused,
    pause,
    resume,
    reconnect,
  } = useTelemetryStream(STREAM_URL);

  const [controlState, setControlState] = useState<ControlStateMap>({});
  const { mutate, isPending, lastError } =
    useOptimisticMutation<ControlStateMap>(controlState, setControlState);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // Surface the hook's own lastError too (covers any failure path that
  // doesn't go through our explicit onError below).
  const lastErrorId = lastError?.id;
  useEffect(() => {
    if (!lastError) return;
    pushToast(
      `${formatNodeName(lastError.id.split(":")[0])}: ${lastError.message}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastErrorId]);

  // ---------------------------------------------------------------------
  // Derive per-node telemetry (latest + bounded history) from the flat
  // event stream. Pure read model — recomputed only when `events` changes,
  // which itself only changes once per animation frame (throttled inside
  // useTelemetryStream), so this never runs faster than 60fps.
  // ---------------------------------------------------------------------
  const derivedNodes = useMemo<Map<string, DerivedNode>>(() => {
    const byNode = new Map<string, TelemetryEvent[]>();
    for (const evt of events) {
      const list = byNode.get(evt.node_id);
      if (list) list.push(evt);
      else byNode.set(evt.node_id, [evt]);
    }

    const result = new Map<string, DerivedNode>();
    for (const [nodeId, evts] of byNode) {
      const recent = evts.slice(-SPARKLINE_HISTORY_POINTS);
      result.set(nodeId, {
        latest: evts[evts.length - 1].metrics,
        history: {
          cpu: recent.map((e) => e.metrics.cpu),
          memory: recent.map((e) => e.metrics.memory),
          latencyMs: recent.map((e) => e.metrics.latencyMs),
          connections: recent.map((e) => e.metrics.connections),
        },
      });
    }
    return result;
  }, [events]);

  const nodeIds = useMemo(
    () => Array.from(derivedNodes.keys()).sort(),
    [derivedNodes],
  );

  // ---------------------------------------------------------------------
  // Control actions
  // ---------------------------------------------------------------------
  const handleRestart = useCallback(
    (nodeId: string) => {
      mutate({
        id: `${nodeId}:restart`,
        optimisticUpdate: (prev) => ({
          ...prev,
          [nodeId]: { ...getControl(prev, nodeId), isRestarting: true },
        }),
        request: simulateNodeActionRequest,
        // Success doesn't roll back anything, but "restarting" isn't the
        // final state we want to keep — clear it explicitly once the
        // restart actually completes.
        onSuccess: () => {
          setControlState((prev) => ({
            ...prev,
            [nodeId]: { ...getControl(prev, nodeId), isRestarting: false },
          }));
        },
        onError: (error) => {
          pushToast(
            `Restart failed for ${formatNodeName(nodeId)} — ${error.message}. Rolled back.`,
          );
        },
      });
    },
    [mutate, pushToast],
  );

  const handleCpuLimitChange = useCallback(
    (nodeId: string, nextLimit: number) => {
      mutate({
        id: `${nodeId}:cpu-limit`,
        optimisticUpdate: (prev) => ({
          ...prev,
          [nodeId]: { ...getControl(prev, nodeId), cpuLimit: nextLimit },
        }),
        request: simulateNodeActionRequest,
        onError: (error) => {
          pushToast(
            `CPU limit change failed for ${formatNodeName(nodeId)} — ${error.message}. Rolled back.`,
          );
        },
      });
    },
    [mutate, pushToast],
  );

  // ---------------------------------------------------------------------
  // Canvas aggregate chart — imperative draw, ref-backed rolling history.
  // Drawing here never calls setState, so it can't cause render thrash
  // even though it re-runs on every `derivedNodes` update.
  // ---------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartHistoryRef = useRef<AggregatePoint[]>([]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const hist = chartHistoryRef.current;
    if (hist.length < 2) return;

    const series: { key: keyof AggregatePoint; color: string }[] = [
      { key: "cpu", color: "#3b82f6" },
      { key: "memory", color: "#22c55e" },
      { key: "latencyMs", color: "#f59e0b" },
    ];

    for (const { key, color } of series) {
      const values = hist.map((p) => p[key]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      ctx.beginPath();
      values.forEach((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }, []);

  // Keep the canvas's pixel buffer matched to its displayed size and DPR,
  // so lines stay crisp instead of stretched/blurry.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      ctx?.scale(dpr, dpr);
      drawChart();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawChart]);

  useEffect(() => {
    if (derivedNodes.size === 0) return;

    let sumCpu = 0;
    let sumMemory = 0;
    let sumLatency = 0;
    for (const node of derivedNodes.values()) {
      sumCpu += node.latest.cpu;
      sumMemory += node.latest.memory;
      sumLatency += node.latest.latencyMs;
    }
    const n = derivedNodes.size;

    const hist = chartHistoryRef.current;
    hist.push({
      cpu: sumCpu / n,
      memory: sumMemory / n,
      latencyMs: sumLatency / n,
    });
    if (hist.length > CHART_HISTORY_POINTS) hist.shift();

    drawChart();
  }, [derivedNodes, drawChart]);

  const connectionStyle = CONNECTION_STYLES[status];

  return (
    <div className="p-6">
      {/* Header: connection status + transport controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-(--ix-text-primary)">
            Live Telemetry
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connectionStyle.dot} ${
                status === "CONNECTING" || status === "RECONNECTING"
                  ? "animate-pulse-soft motion-reduce:animate-none"
                  : ""
              }`}
              aria-hidden="true"
            />
            <span className={connectionStyle.text}>
              {connectionStyle.label}
            </span>
            {status === "RECONNECTING" && (
              <span className="text-(--ix-text-muted)">
                (attempt {retryCount}/{maxRetries})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "ERROR" ? (
            <button
              type="button"
              onClick={reconnect}
              className="flex items-center gap-1.5 rounded-(--ix-radius) border border-(--ix-danger) px-3 py-1.5 text-xs font-medium text-(--ix-danger) hover:bg-(--ix-surface-raised) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ix-danger)"
            >
              <RefreshCw size={13} />
              Reconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={isPaused ? resume : pause}
              className="flex items-center gap-1.5 rounded-(--ix-radius) border border-(--ix-border) px-3 py-1.5 text-xs font-medium text-(--ix-text-primary) hover:border-(--ix-accent) hover:bg-(--ix-surface-raised) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ix-accent)"
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </div>

      {/* ERROR banner: max retries hit, needs manual intervention */}
      {status === "ERROR" && (
        <div className="mb-6 flex items-center gap-2 rounded-(--ix-radius) border border-(--ix-danger) bg-(--ix-surface-raised) px-4 py-3 text-sm text-(--ix-danger)">
          <AlertTriangle size={16} />
          Lost connection after {maxRetries} attempts. Data below is frozen —
          reconnect to resume.
        </div>
      )}

      {/* Aggregate live chart */}
      <div className="mb-6 rounded-(--ix-radius) border border-(--ix-border) bg-(--ix-surface) p-4">
        <div className="mb-2 flex items-center gap-4 text-xs text-(--ix-text-muted)">
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#3b82f6" }}
            />
            Avg CPU
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#22c55e" }}
            />
            Avg Memory
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#f59e0b" }}
            />
            Avg Latency
          </span>
        </div>
        <canvas ref={canvasRef} className="h-48 w-full" />
      </div>

      {/* Node grid */}
      {nodeIds.length === 0 ? (
        <div className="rounded-(--ix-radius) border border-dashed border-(--ix-border) p-8 text-center text-sm text-(--ix-text-muted)">
          Waiting for the first telemetry events…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodeIds.map((nodeId) => {
            const node = derivedNodes.get(nodeId);
            const control = getControl(controlState, nodeId);
            return (
              <NodeCard
                key={nodeId}
                nodeId={nodeId}
                nodeName={formatNodeName(nodeId)}
                status={deriveStatus(node?.latest, control.isRestarting)}
                cpuLimit={control.cpuLimit}
                metrics={
                  node?.latest ?? {
                    cpu: 0,
                    memory: 0,
                    latencyMs: 0,
                    connections: 0,
                  }
                }
                history={
                  node?.history ?? {
                    cpu: [],
                    memory: [],
                    latencyMs: [],
                    connections: [],
                  }
                }
                isRestartPending={isPending(`${nodeId}:restart`)}
                isCpuLimitPending={isPending(`${nodeId}:cpu-limit`)}
                onRestart={() => handleRestart(nodeId)}
                onCpuLimitChange={(next) => handleCpuLimitChange(nodeId, next)}
              />
            );
          })}
        </div>
      )}

      {/* Non-disruptive error toasts (rollback notifications) */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="max-w-sm rounded-(--ix-radius) border border-(--ix-danger) bg-(--ix-surface-raised) px-4 py-2.5 text-sm text-(--ix-text-primary) shadow-lg"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RingBuffer, RingBufferItem } from "../utils/RingBuffer";

/**
 * useTelemetryStream
 * ---------------------------------------------------------------------------
 * Resilient SSE connection manager for the live telemetry stream.
 *
 *  - Exponential backoff reconnection (2^n * 1000ms + jitter, max 5 retries)
 *  - Heartbeat-based zombie detection (force reconnect if silent > 15s)
 *  - Deduplicated, bounded event history via RingBuffer (default cap: 500)
 *  - Batches high-frequency messages into React state at most once per
 *    animation frame, so bursts of events never cause render thrashing
 *  - Pause/resume: freezes what the UI *shows* without losing what's
 *    happening on the wire underneath (buffer keeps recording)
 *  - Guaranteed teardown of EventSource + all timers on unmount
 * ---------------------------------------------------------------------------
 */

export type ConnectionState =
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ERROR";

export interface TelemetryMetrics {
  cpu: number;
  memory: number;
  latencyMs: number;
  connections: number;
}

export interface TelemetryEvent extends RingBufferItem {
  seq_id: number;
  node_id: string;
  timestamp: number;
  metrics: TelemetryMetrics;
}

export interface UseTelemetryStreamOptions {
  bufferCapacity?: number; // default 500
  maxRetries?: number; // default 5
  heartbeatTimeoutMs?: number; // default 15000
  baseBackoffMs?: number; // default 1000
}

export interface UseTelemetryStreamResult {
  status: ConnectionState;
  events: TelemetryEvent[]; // ring buffer snapshot, oldest -> newest
  retryCount: number;
  maxRetries: number;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reconnect: () => void; // manual retry (e.g. after ERROR state)
  disconnect: () => void; // intentional close
}

const DEFAULTS: Required<UseTelemetryStreamOptions> = {
  bufferCapacity: 500,
  maxRetries: 5,
  heartbeatTimeoutMs: 15_000,
  baseBackoffMs: 1000,
};

export function useTelemetryStream(
  url: string,
  options: UseTelemetryStreamOptions = {},
): UseTelemetryStreamResult {
  const bufferCapacity = options.bufferCapacity ?? DEFAULTS.bufferCapacity;
  const maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
  const heartbeatTimeoutMs =
    options.heartbeatTimeoutMs ?? DEFAULTS.heartbeatTimeoutMs;
  const baseBackoffMs = options.baseBackoffMs ?? DEFAULTS.baseBackoffMs;

  const [status, setStatus] = useState<ConnectionState>("CONNECTING");
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Lazily-initialized once; persists for the lifetime of the hook so
  // history survives reconnects (dedup makes replayed events harmless).
  const bufferRef = useRef<RingBuffer<TelemetryEvent> | null>(null);
  if (bufferRef.current === null) {
    bufferRef.current = new RingBuffer<TelemetryEvent>(bufferCapacity);
  }

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Imperative controls are implemented inside the effect (where the
  // connection lives) and exposed to the outside world through stable
  // ref-backed callbacks, so consumers get a stable function identity.
  const pauseHandleRef = useRef<() => void>(() => {});
  const resumeHandleRef = useRef<() => void>(() => {});
  const reconnectHandleRef = useRef<() => void>(() => {});
  const disconnectHandleRef = useRef<() => void>(() => {});

  useEffect(() => {
    let isUnmounted = false;
    let eventSource: EventSource | null = null;
    let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
    let backoffTimeout: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;
    let pendingFlush = false;
    let retries = 0;

    const clearHeartbeatWatchdog = () => {
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
    };

    const clearBackoff = () => {
      if (backoffTimeout) {
        clearTimeout(backoffTimeout);
        backoffTimeout = null;
      }
    };

    const teardown = () => {
      clearHeartbeatWatchdog();
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    // Flush ring buffer -> React state at most once per animation frame.
    const scheduleFlush = () => {
      if (pendingFlush || isPausedRef.current) return;
      pendingFlush = true;
      rafId = requestAnimationFrame(() => {
        pendingFlush = false;
        if (isUnmounted) return;
        setEvents(bufferRef.current!.toArray());
      });
    };

    const armHeartbeatWatchdog = () => {
      clearHeartbeatWatchdog();
      heartbeatTimeout = setTimeout(() => {
        // Connection looks open but the server has gone silent -> zombie.
        scheduleReconnect();
      }, heartbeatTimeoutMs);
    };

    const scheduleReconnect = () => {
      teardown();
      if (isUnmounted) return;

      if (retries >= maxRetries) {
        setStatus("ERROR");
        return;
      }

      const attempt = retries;
      retries += 1;
      setRetryCount(retries);
      setStatus("RECONNECTING");

      const jitter = Math.random() * 500;
      const delay = Math.pow(2, attempt) * baseBackoffMs + jitter;

      clearBackoff();
      backoffTimeout = setTimeout(() => {
        if (!isUnmounted) connect();
      }, delay);
    };

    const connect = () => {
      if (isUnmounted) return;
      teardown();
      setStatus(retries === 0 ? "CONNECTING" : "RECONNECTING");

      const es = new EventSource(url);
      eventSource = es;

      es.addEventListener("connected", () => {
        if (isUnmounted) return;
        setStatus("CONNECTED");
        retries = 0;
        setRetryCount(0);
        armHeartbeatWatchdog();
      });

      es.addEventListener("heartbeat", () => {
        if (isUnmounted) return;
        armHeartbeatWatchdog();
      });

      es.addEventListener("telemetry", (evt: MessageEvent) => {
        if (isUnmounted) return;
        armHeartbeatWatchdog(); // telemetry data also counts as liveness
        try {
          const parsed = JSON.parse(evt.data) as TelemetryEvent;
          bufferRef.current!.push(parsed); // no-op if duplicate seq_id
          scheduleFlush();
        } catch {
          // Malformed single message - drop it, don't tear down the stream.
        }
      });

      es.onerror = () => {
        if (isUnmounted) return;
        scheduleReconnect();
      };
    };

    pauseHandleRef.current = () => setIsPaused(true);
    resumeHandleRef.current = () => {
      setIsPaused(false);
      // Catch the UI up immediately with everything recorded while paused.
      setEvents(bufferRef.current!.toArray());
    };
    reconnectHandleRef.current = () => {
      clearBackoff();
      retries = 0;
      setRetryCount(0);
      connect();
    };
    disconnectHandleRef.current = () => {
      clearBackoff();
      teardown();
      setStatus("DISCONNECTED");
    };

    connect();

    return () => {
      isUnmounted = true;
      teardown();
      clearBackoff();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [url, maxRetries, heartbeatTimeoutMs, baseBackoffMs]);

  const pause = useCallback(() => pauseHandleRef.current(), []);
  const resume = useCallback(() => resumeHandleRef.current(), []);
  const reconnect = useCallback(() => reconnectHandleRef.current(), []);
  const disconnect = useCallback(() => disconnectHandleRef.current(), []);

  return {
    status,
    events,
    retryCount,
    maxRetries,
    isPaused,
    pause,
    resume,
    reconnect,
    disconnect,
  };
}

import { NextRequest } from "next/server";

/**
 * Mock Telemetry SSE Stream
 * ---------------------------------------------------------------------------
 * Simulates a real infrastructure telemetry backend over Server-Sent Events.
 *
 * Emits two event types:
 *   - "telemetry": per-node metrics (cpu, memory, latency, connections)
 *   - "heartbeat": a lightweight ping so the client can detect zombie
 *                  connections (connection looks open, but server has gone
 *                  silent)
 *
 * Deliberately simulates instability (closes the stream early at random
 * intervals) so useTelemetryStream's exponential backoff + reconnect logic
 * has something real to be tested against, rather than only working in
 * the happy path.
 *
 * Swap this out for a real backend later without changing any client code —
 * the client only depends on the SSE event contract below.
 * ---------------------------------------------------------------------------
 */

export const dynamic = "force-dynamic"; // never cache a live stream

const NODE_IDS = [
  "node-alpha-01",
  "node-alpha-02",
  "node-beta-01",
  "node-beta-02",
  "node-gamma-01",
];

const TELEMETRY_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 5000;

// Randomly kill the connection somewhere between 20s and 45s in, to
// simulate real-world drops (deploys, load balancer resets, etc).
const MIN_CONNECTION_LIFETIME_MS = 20_000;
const MAX_CONNECTION_LIFETIME_MS = 45_000;

function randomWalk(prev: number, min: number, max: number, maxStep: number) {
  const step = (Math.random() * 2 - 1) * maxStep;
  return Math.min(max, Math.max(min, prev + step));
}

function sseFormat(event: string, data: unknown, id?: string | number) {
  const lines: string[] = [];
  if (id !== undefined) lines.push(`id: ${id}`);
  lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return lines.join("\n") + "\n\n";
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Per-connection mutable state
  let seqCounter = 0;
  const nodeState = new Map(
    NODE_IDS.map((id) => [
      id,
      {
        cpu: 30 + Math.random() * 20,
        memory: 40 + Math.random() * 20,
        latencyMs: 20 + Math.random() * 15,
        connections: Math.floor(50 + Math.random() * 100),
      },
    ]),
  );

  let telemetryTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed (client disconnected) — ignore.
          closed = true;
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (telemetryTimer) clearInterval(telemetryTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (killTimer) clearTimeout(killTimer);
        try {
          controller.close();
        } catch {
          // already closed, ignore
        }
      };

      // Initial "connected" acknowledgment event
      safeEnqueue(
        sseFormat("connected", { message: "stream established" }, ++seqCounter),
      );

      // Emit telemetry for all nodes on every tick
      telemetryTimer = setInterval(() => {
        for (const [nodeId, prev] of nodeState) {
          const next = {
            cpu: Math.round(randomWalk(prev.cpu, 5, 98, 6) * 10) / 10,
            memory: Math.round(randomWalk(prev.memory, 10, 95, 4) * 10) / 10,
            latencyMs: Math.round(randomWalk(prev.latencyMs, 5, 400, 15)),
            connections: Math.round(randomWalk(prev.connections, 0, 500, 20)),
          };
          nodeState.set(nodeId, next);

          seqCounter += 1;
          safeEnqueue(
            sseFormat(
              "telemetry",
              {
                seq_id: seqCounter,
                node_id: nodeId,
                timestamp: Date.now(),
                metrics: next,
              },
              seqCounter,
            ),
          );
        }
      }, TELEMETRY_INTERVAL_MS);

      // Heartbeat so the client can detect a "zombie" connection
      heartbeatTimer = setInterval(() => {
        seqCounter += 1;
        safeEnqueue(
          sseFormat(
            "heartbeat",
            { seq_id: seqCounter, timestamp: Date.now() },
            seqCounter,
          ),
        );
      }, HEARTBEAT_INTERVAL_MS);

      // Simulate an unstable connection: close early at a random point so
      // reconnect/backoff logic gets exercised during development.
      const lifetime =
        MIN_CONNECTION_LIFETIME_MS +
        Math.random() *
          (MAX_CONNECTION_LIFETIME_MS - MIN_CONNECTION_LIFETIME_MS);
      killTimer = setTimeout(cleanup, lifetime);

      // If the client disconnects (tab closed, hook unmounted, etc),
      // the request signal fires — clean up timers so nothing leaks.
      request.signal.addEventListener("abort", cleanup);
    },

    cancel() {
      // Called if the consumer cancels the stream reader directly.
      closed = true;
      if (telemetryTimer) clearInterval(telemetryTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (killTimer) clearTimeout(killTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable proxy buffering (e.g. nginx)
    },
  });
}

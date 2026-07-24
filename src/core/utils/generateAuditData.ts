export type AuditStatus = "success" | "warning" | "error";

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  status: AuditStatus;
  ipAddress: string;
  durationMs: number;
}

const ACTIONS = [
  "LOGIN",
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
  "INVITE",
] as const;
const RESOURCES = [
  "workspace",
  "billing",
  "user",
  "integration",
  "report",
  "apiKey",
] as const;
const STATUSES: AuditStatus[] = [
  "success",
  "success",
  "success",
  "warning",
  "error",
];
const ACTOR_DOMAINS = [
  "infinityx.com",
  "partner.infinityx.com",
  "contractor.dev",
];

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length] as T;
}

function pseudoRandomIp(seed: number): string {
  const a = (seed * 7) % 256;
  const b = (seed * 13) % 256;
  const c = (seed * 29) % 256;
  const d = (seed * 53) % 256;
  return `${a}.${b}.${c}.${d}`;
}

/**
 * Deterministic generator — same seed always produces the same dataset.
 * Avoids Math.random() so demo results (and any screenshots/tests) are stable.
 */
export function generateAuditData(count: number): AuditRecord[] {
  const baseTimestamp = Date.UTC(2026, 0, 1);
  const records: AuditRecord[] = new Array(count);

  for (let i = 0; i < count; i += 1) {
    const timestamp = baseTimestamp + i * 45_000; // 45s apart
    records[i] = {
      id: `evt_${i.toString(36).padStart(6, "0")}`,
      timestamp: new Date(timestamp).toISOString(),
      actor: `user${i % 4321}@${pick(ACTOR_DOMAINS, i)}`,
      action: pick(ACTIONS, i),
      resource: `${pick(RESOURCES, i + 1)}-${(i % 900) + 100}`,
      status: pick(STATUSES, i + 2),
      ipAddress: pseudoRandomIp(i + 1),
      durationMs: 20 + ((i * 37) % 980),
    };
  }

  return records;
}

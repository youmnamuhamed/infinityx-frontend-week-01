// src/core/utils/draftStorage.ts

/**
 * Encrypted localStorage persistence for in-progress wizard drafts.
 *
 * Threat model: this protects against casual inspection of localStorage
 * (devtools, browser extensions that scrape plain localStorage keys) —
 * it is NOT a substitute for never storing real secrets client-side.
 * The AES key lives in sessionStorage, so it disappears when the tab
 * closes; a draft becomes unreadable garbage after that point by design.
 * Drafts are meant to survive an accidental refresh/tab-close within the
 * same session, not to persist indefinitely.
 */

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — stale drafts silently expire
const KEY_STORAGE_KEY = "ixs_draft_key_v1";

interface StoredDraft {
  version: number;
  savedAt: number;
  stepId: string;
  payload: string; // base64(iv + ciphertext)
}

export interface DraftEnvelope<TContext> {
  stepId: string;
  context: TContext;
  savedAt: number;
}

function isCryptoAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.crypto?.subtle &&
    typeof window.crypto.subtle.encrypt === "function"
  );
}

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = sessionStorage.getItem(KEY_STORAGE_KEY);

  if (existing) {
    const raw = base64ToBuffer(existing);
    return window.crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }

  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const exported = await window.crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(KEY_STORAGE_KEY, bufferToBase64(exported));

  return key;
}

async function encrypt(plainText: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  // iv first (12 bytes), then ciphertext — decrypt() splits them back apart.
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);

  return bufferToBase64(combined.buffer);
}

async function decrypt(payload: string): Promise<string> {
  const key = await getOrCreateKey();
  const combined = new Uint8Array(base64ToBuffer(payload));
  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);

  const plainBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes,
  );

  return new TextDecoder().decode(plainBuf);
}

function draftKey(workspaceId: string): string {
  return `ixs_provision_draft_${workspaceId}`;
}

export async function saveDraft<TContext>(
  workspaceId: string,
  stepId: string,
  context: TContext,
): Promise<void> {
  if (!isCryptoAvailable()) {
    // Non-secure context (e.g. plain http on an old dev box) — skip rather
    // than fall back to writing plaintext form data to disk.
    return;
  }

  try {
    const payload = await encrypt(JSON.stringify(context));
    const record: StoredDraft = {
      version: DRAFT_VERSION,
      savedAt: Date.now(),
      stepId,
      payload,
    };
    localStorage.setItem(draftKey(workspaceId), JSON.stringify(record));
  } catch {
    // Quota exceeded, private-browsing restrictions, etc. A failed
    // draft save should never block the user's actual workflow.
  }
}

export async function loadDraft<TContext>(
  workspaceId: string,
): Promise<DraftEnvelope<TContext> | null> {
  if (!isCryptoAvailable()) return null;

  const raw = localStorage.getItem(draftKey(workspaceId));
  if (!raw) return null;

  try {
    const record: StoredDraft = JSON.parse(raw);

    if (record.version !== DRAFT_VERSION) {
      clearDraft(workspaceId);
      return null;
    }

    if (Date.now() - record.savedAt > DRAFT_TTL_MS) {
      clearDraft(workspaceId);
      return null;
    }

    const decrypted = await decrypt(record.payload);
    return {
      stepId: record.stepId,
      context: JSON.parse(decrypted) as TContext,
      savedAt: record.savedAt,
    };
  } catch {
    // Corrupt record, or the session key rotated (new tab/session) so the
    // old ciphertext can't be decrypted. Treat as "no usable draft".
    clearDraft(workspaceId);
    return null;
  }
}

export function clearDraft(workspaceId: string): void {
  localStorage.removeItem(draftKey(workspaceId));
}

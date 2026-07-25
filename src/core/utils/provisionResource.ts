// src/core/utils/provisionResource.ts
import type { ProvisioningContext } from "@/core/types/provisioning";

export interface ProvisioningResult {
  resourceId: string;
  status: "provisioned";
  provisionedAt: string;
}

export class ProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisioningError";
  }
}

function generateResourceId(context: ProvisioningContext): string {
  const base =
    (context.general as { clusterName?: string })?.clusterName || "cluster";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Mock provisioning call. Swap the body for a real fetch()/Server Action
 * later — callers only depend on the resolved ProvisioningResult shape or
 * a thrown ProvisioningError, so nothing at the call site needs to change.
 */
export async function submitProvisioningRequest(
  context: ProvisioningContext,
  options?: { simulateFailureRate?: number },
): Promise<ProvisioningResult> {
  const delay = 1200 + Math.random() * 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const failureRate = options?.simulateFailureRate ?? 0;
  if (Math.random() < failureRate) {
    throw new ProvisioningError(
      "Provisioning failed. Check the details below and try again.",
    );
  }

  return {
    resourceId: generateResourceId(context),
    status: "provisioned",
    provisionedAt: new Date().toISOString(),
  };
}

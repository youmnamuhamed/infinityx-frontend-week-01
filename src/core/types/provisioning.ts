// src/core/types/provisioning.ts
import type {
  GeneralInfoData,
  NetworkTopologyData,
  SecurityData,
} from "@/core/schemas/provisioningSchema";

export interface ProvisioningContext {
  general: Partial<GeneralInfoData>;
  network: Partial<NetworkTopologyData>;
  security: Partial<SecurityData>;
}

export const PROVISIONING_STEPS = [
  "general-info",
  "network-topology",
  "security-iam",
  "review-submit",
] as const;

export type ProvisioningStepId = (typeof PROVISIONING_STEPS)[number];

export const STEP_LABELS: Record<ProvisioningStepId, string> = {
  "general-info": "General Info",
  "network-topology": "Network Topology",
  "security-iam": "Security & IAM",
  "review-submit": "Review & Provision",
};

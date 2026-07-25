"use client";

import { Loader2 } from "lucide-react";
import type { ProvisioningContext } from "@/core/types/provisioning";

interface StepReviewSubmissionProps {
  context: ProvisioningContext;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border-subtle py-2 text-sm last:border-none">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function StepReviewSubmission({
  context,
  isSubmitting,
  submitError,
  onSubmit,
}: StepReviewSubmissionProps) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-foreground">General</h3>
        <dl className="mt-2">
          <ReviewRow
            label="Cluster name"
            value={context.general.clusterName ?? "—"}
          />
          <ReviewRow
            label="Environment"
            value={context.general.environment ?? "—"}
          />
          <ReviewRow label="Region" value={context.general.region ?? "—"} />
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground">Network</h3>
        <dl className="mt-2">
          <ReviewRow label="VPC type" value={context.network.vpcType ?? "—"} />
          {context.network.vpcType === "custom" && (
            <ReviewRow
              label="Subnet CIDR"
              value={context.network.subnetCidr ?? "—"}
            />
          )}
          <ReviewRow
            label="Public gateway"
            value={
              context.network.publicGatewayEnabled ? "Enabled" : "Disabled"
            }
          />
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground">Security</h3>
        <dl className="mt-2">
          <ReviewRow
            label="IAM role"
            value={context.security.iamRoleName ?? "—"}
          />
          <ReviewRow
            label="Allowed ports"
            value={context.security.allowedPorts?.join(", ") || "—"}
          />
          {context.network.publicGatewayEnabled && (
            <ReviewRow
              label="Firewall rule"
              value={context.security.publicFirewallRule ?? "—"}
            />
          )}
        </dl>
      </section>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        aria-keyshortcuts="Meta+Enter Control+Enter"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isSubmitting ? "Provisioning…" : "Provision cluster"}
      </button>

      <p aria-live="polite" className="min-h-/[1.25rem] text-sm text-danger">
        {submitError ?? ""}
      </p>
    </div>
  );
}

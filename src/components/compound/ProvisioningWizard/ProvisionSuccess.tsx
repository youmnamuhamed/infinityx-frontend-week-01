// src/components/compound/ProvisioningWizard/ProvisionSuccess.tsx
"use client";

import { CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import type { ProvisioningResult } from "@/core/utils/provisionResource";

interface ProvisionSuccessProps {
  result: ProvisioningResult;
  workspaceId: string;
  onProvisionAnother: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>; // add "| null" here
}
export function ProvisionSuccess({
  result,
  workspaceId,
  onProvisionAnother,
  headingRef,
}: ProvisionSuccessProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-semibold text-foreground focus:outline-none"
      >
        Cluster provisioned
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Your resource is live and ready to use.
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-md border border-border bg-surface-raised p-4 text-left text-sm">
        <div className="flex justify-between py-1">
          <span className="text-fg-muted">Resource ID</span>
          <span className="font-mono text-foreground">{result.resourceId}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-fg-muted">Status</span>
          <span className="text-success">{result.status}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-fg-muted">Provisioned at</span>
          <span className="text-foreground">
            {new Date(result.provisionedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={onProvisionAnother}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-raised"
        >
          <RotateCcw className="h-4 w-4" />
          Provision another
        </button>

        <a
          href={`/workspaces/${workspaceId}/resources/${result.resourceId}`}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Go to resource
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

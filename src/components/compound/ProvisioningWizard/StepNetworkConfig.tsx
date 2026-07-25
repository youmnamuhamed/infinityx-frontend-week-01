// src/components/compound/ProvisioningWizard/StepNetworkConfig.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  networkTopologySchema,
  type NetworkTopologyData,
} from "@/core/schemas/provisioningSchema";
import { FieldError } from "@/components/primitive/FieldError";

interface StepNetworkConfigProps {
  defaultValues: Partial<NetworkTopologyData>;
  onValidSubmit: (data: NetworkTopologyData) => void;
}

export function StepNetworkConfig({
  defaultValues,
  onValidSubmit,
}: StepNetworkConfigProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NetworkTopologyData>({
    resolver: zodResolver(networkTopologySchema),
    mode: "onBlur",
    defaultValues: {
      vpcType: "default",
      publicGatewayEnabled: true,
      ...defaultValues,
    },
  });

  // Watching vpcType is what makes the subnet field "dependent" — it only
  // exists in the DOM (and therefore only gets validated) once a custom
  // VPC is chosen. This is the in-step half of the cross-step dependent
  // logic; the other half (firewall rule required in Security & IAM) is
  // handled by buildSecuritySchema reading this step's publicGatewayEnabled.
  const vpcType = watch("vpcType");

  return (
    <form
      id="step-network-topology"
      onSubmit={handleSubmit(onValidSubmit)}
      noValidate
      className="space-y-6"
    >
      <fieldset>
        <legend className="text-sm font-medium text-foreground">
          VPC type
        </legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input
              type="radio"
              value="default"
              className="h-4 w-4 accent-/[var(--ix-accent)]"
              {...register("vpcType")}
            />
            Default VPC — managed subnet, fastest to provision
          </label>
          <label className="flex items-center gap-2 text-sm text-fg-secondary">
            <input
              type="radio"
              value="custom"
              className="h-4 w-4 accent-/[var(--ix-accent)]"
              {...register("vpcType")}
            />
            Custom VPC — bring your own subnet
          </label>
        </div>
      </fieldset>

      {vpcType === "custom" && (
        <div>
          <label
            htmlFor="subnetCidr"
            className="block text-sm font-medium text-foreground"
          >
            Subnet CIDR
          </label>
          <input
            id="subnetCidr"
            type="text"
            placeholder="10.0.0.0/24"
            aria-invalid={!!errors.subnetCidr}
            aria-describedby="subnetCidr-error"
            className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            {...register("subnetCidr")}
          />
          <FieldError
            id="subnetCidr-error"
            message={errors.subnetCidr?.message}
          />
        </div>
      )}

      <div>
        <label className="flex items-center gap-2 text-sm text-fg-secondary">
          <input
            type="checkbox"
            className="h-4 w-4 accent-\[var(--ix-accent)]"
            {...register("publicGatewayEnabled")}
          />
          Enable public gateway
        </label>
        <p className="mt-1.5 text-xs text-fg-muted">
          If enabled, you&apos;ll be required to define a firewall rule in the
          next step.
        </p>
      </div>
    </form>
  );
}

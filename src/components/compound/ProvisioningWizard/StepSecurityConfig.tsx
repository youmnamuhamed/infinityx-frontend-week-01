// src/components/compound/ProvisioningWizard/StepSecurityConfig.tsx
"use client";

import { useForm } from "react-hook-form";
import {
  buildSecuritySchema,
  type SecurityData,
  type NetworkTopologyData,
} from "@/core/schemas/provisioningSchema";
import { FieldError } from "@/components/primitive/FieldError";

interface StepSecurityConfigProps {
  defaultValues: Partial<SecurityData>;
  /** Step 2's validated output — this is what makes publicFirewallRule conditionally required */
  networkContext: NetworkTopologyData;
  onValidSubmit: (data: SecurityData) => void;
}

interface SecurityFormShape {
  iamRoleName: string;
  allowedPortsInput: string;
  publicFirewallRule: string;
}

export function StepSecurityConfig({
  defaultValues,
  networkContext,
  onValidSubmit,
}: StepSecurityConfigProps) {
  // buildSecuritySchema needs networkContext to decide whether publicFirewallRule
  // is required, so it can't be handed to zodResolver as a static resolver —
  // we validate manually on submit instead, using the same schema.
  const schema = buildSecuritySchema(networkContext);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SecurityFormShape>({
    mode: "onBlur",
    defaultValues: {
      iamRoleName: defaultValues.iamRoleName ?? "",
      allowedPortsInput: defaultValues.allowedPorts?.join(", ") ?? "",
      publicFirewallRule: defaultValues.publicFirewallRule ?? "",
    },
  });

  const onSubmit = handleSubmit((formValues) => {
    clearErrors();

    const allowedPorts = formValues.allowedPortsInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map(Number);

    const result = schema.safeParse({
      iamRoleName: formValues.iamRoleName,
      allowedPorts,
      publicFirewallRule: formValues.publicFirewallRule,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field =
          issue.path[0] === "allowedPorts"
            ? "allowedPortsInput"
            : (issue.path[0] as string);
        setError(field as keyof SecurityFormShape, { message: issue.message });
      }
      return;
    }

    onValidSubmit(result.data);
  });

  return (
    <form
      id="step-security-iam"
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="iamRoleName"
          className="block text-sm font-medium text-foreground"
        >
          IAM role name
        </label>
        <input
          id="iamRoleName"
          type="text"
          aria-invalid={!!errors.iamRoleName}
          aria-describedby="iamRoleName-error"
          className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          {...register("iamRoleName")}
        />
        <FieldError
          id="iamRoleName-error"
          message={errors.iamRoleName?.message}
        />
      </div>

      <div>
        <label
          htmlFor="allowedPortsInput"
          className="block text-sm font-medium text-foreground"
        >
          Allowed ports
        </label>
        <input
          id="allowedPortsInput"
          type="text"
          placeholder="22, 443, 8080"
          aria-invalid={!!errors.allowedPortsInput}
          aria-describedby="allowedPortsInput-error"
          className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          {...register("allowedPortsInput")}
        />
        <p className="mt-1.5 text-xs text-fg-muted">
          Comma-separated port numbers.
        </p>
        <FieldError
          id="allowedPortsInput-error"
          message={errors.allowedPortsInput?.message}
        />
      </div>

      {networkContext.publicGatewayEnabled && (
        <div>
          <label
            htmlFor="publicFirewallRule"
            className="block text-sm font-medium text-foreground"
          >
            Public firewall rule
          </label>
          <input
            id="publicFirewallRule"
            type="text"
            placeholder="allow-https-inbound"
            aria-invalid={!!errors.publicFirewallRule}
            aria-describedby="publicFirewallRule-error"
            className="mt-1.5 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            {...register("publicFirewallRule")}
          />
          <p className="mt-1.5 text-xs text-fg-muted">
            Required because a public gateway was enabled in the previous step.
          </p>
          <FieldError
            id="publicFirewallRule-error"
            message={errors.publicFirewallRule?.message}
          />
        </div>
      )}
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ChevronDown } from "lucide-react";
import {
  generalInfoSchemaWithAsyncCheck,
  type GeneralInfoData,
} from "@/core/schemas/provisioningSchema";
import { FieldError } from "@/components/primitive/FieldError";

interface StepGeneralConfigProps {
  defaultValues: Partial<GeneralInfoData>;
  onValidSubmit: (data: GeneralInfoData) => void;
}

const REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-central-1", label: "EU (Frankfurt)" },
  { value: "me-south-1", label: "Middle East (Bahrain)" },
];

export function StepGeneralConfig({
  defaultValues,
  onValidSubmit,
}: StepGeneralConfigProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValidating },
  } = useForm<GeneralInfoData>({
    resolver: zodResolver(generalInfoSchemaWithAsyncCheck),
    mode: "onBlur",
    defaultValues,
  });

  return (
    <form
      id="step-general-info"
      onSubmit={handleSubmit(onValidSubmit)}
      noValidate
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="clusterName"
          className="block text-sm font-medium text-foreground"
        >
          Cluster name
        </label>
        <div className="relative mt-1.5">
          <input
            id="clusterName"
            type="text"
            autoComplete="off"
            aria-invalid={!!errors.clusterName}
            aria-describedby="clusterName-error"
            className="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="my-cluster"
            {...register("clusterName")}
          />
          {isValidating && (
            <Loader2
              className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-fg-muted"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="mt-1.5 text-xs text-fg-muted">
          Lowercase letters, numbers, and hyphens only. Checked for availability
          on blur.
        </p>
        <FieldError
          id="clusterName-error"
          message={errors.clusterName?.message}
        />
      </div>

      <div>
        <label
          htmlFor="environment"
          className="block text-sm font-medium text-foreground"
        >
          Environment
        </label>
        <div className="relative mt-1.5">
          <select
            id="environment"
            aria-invalid={!!errors.environment}
            aria-describedby="environment-error"
            className="block w-full appearance-none rounded-md border border-border bg-surface px-3 py-2 pr-9 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            defaultValue=""
            {...register("environment")}
          >
            <option value="" disabled>
              Select an environment
            </option>
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-fg-muted"
            aria-hidden="true"
          />
        </div>
        <FieldError
          id="environment-error"
          message={errors.environment?.message}
        />
      </div>

      <div>
        <label
          htmlFor="region"
          className="block text-sm font-medium text-foreground"
        >
          Region
        </label>
        <div className="relative mt-1.5">
          <select
            id="region"
            aria-invalid={!!errors.region}
            aria-describedby="region-error"
            className="block w-full appearance-none rounded-md border border-border bg-surface px-3 py-2 pr-9 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            defaultValue=""
            {...register("region")}
          >
            <option value="" disabled>
              Select a region
            </option>
            {REGIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-fg-muted"
            aria-hidden="true"
          />
        </div>
        <FieldError id="region-error" message={errors.region?.message} />
      </div>
    </form>
  );
}

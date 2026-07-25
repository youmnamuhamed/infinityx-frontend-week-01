"use client";

import { Check, AlertCircle } from "lucide-react";
import {
  PROVISIONING_STEPS,
  STEP_LABELS,
  type ProvisioningStepId,
} from "@/core/types/provisioning";

type StepStatusValue = "valid" | "invalid" | "untouched";

interface WizardStepperProps {
  currentStepId: string;
  stepStatus: Record<string, StepStatusValue>;
  history: string[];
  onStepSelect: (stepId: ProvisioningStepId) => void;
}

export function WizardStepper({
  currentStepId,
  stepStatus,
  history,
  onStepSelect,
}: WizardStepperProps) {
  return (
    <nav aria-label="Provisioning steps" className="mb-8">
      <ol className="flex items-center">
        {PROVISIONING_STEPS.map((stepId, index) => {
          const isCurrent = stepId === currentStepId;
          const isReachable = history.includes(stepId) || isCurrent;
          const status = stepStatus[stepId] ?? "untouched";
          const isLast = index === PROVISIONING_STEPS.length - 1;

          return (
            <li
              key={stepId}
              className="flex flex-1 items-center last:flex-none"
            >
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepSelect(stepId)}
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "group flex items-center gap-2.5 rounded-md py-1.5 pr-2 text-left transition-colors",
                  isReachable ? "cursor-pointer" : "cursor-not-allowed",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    isCurrent
                      ? "border-accent bg-accent text-white"
                      : status === "valid"
                        ? "border-success bg-success/10 text-success"
                        : status === "invalid"
                          ? "border-danger bg-danger/10 text-danger"
                          : "border-border bg-surface text-fg-muted",
                  ].join(" ")}
                >
                  {status === "valid" && !isCurrent ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : status === "invalid" && !isCurrent ? (
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={[
                    "hidden text-sm sm:inline",
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-fg-secondary",
                  ].join(" ")}
                >
                  {STEP_LABELS[stepId]}
                </span>
              </button>
              {!isLast && (
                <div
                  className={[
                    "mx-2 h-px flex-1",
                    isReachable ? "bg-border" : "bg-border-subtle",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

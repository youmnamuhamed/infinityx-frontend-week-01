// src/components/compound/ProvisioningWizard/WizardContainer.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useWorkflowEngine,
  type StepDefinition,
} from "@/core/hooks/useWorkflowEngine";
import { useDraftPersistence } from "@/core/hooks/useDraftPersistence";
import { useWizardKeyboardShortcut } from "@/core/hooks/useWizardKeyboardShortcut";
import {
  serializeStateToParams,
  parseParamsToState,
} from "@/core/utils/urlStateSync";
import {
  PROVISIONING_STEPS,
  STEP_LABELS,
  type ProvisioningContext,
  type ProvisioningStepId,
} from "@/core/types/provisioning";
import {
  generalInfoSchema,
  networkTopologySchema,
  buildSecuritySchema,
  type NetworkTopologyData,
} from "@/core/schemas/provisioningSchema";
import {
  submitProvisioningRequest,
  ProvisioningError,
  type ProvisioningResult,
} from "@/core/utils/provisionResource";
import { WizardStepper } from "./WizardStepper";
import { StepGeneralConfig } from "./StepGeneralConfig";
import { StepNetworkConfig } from "./StepNetworkConfig";
import { StepSecurityConfig } from "./StepSecurityConfig";
import { StepReviewSubmission } from "./StepReviewSubmission";
import { ProvisionSuccess } from "./ProvisionSuccess";

const STEP_ORDER = [...PROVISIONING_STEPS];

const ALLOWED_ENVIRONMENTS = ["dev", "staging", "production"] as const;
const ALLOWED_VPC_TYPES = ["default", "custom"] as const;

function sanitizeEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

// Defined once, outside the component: these never depend on props or state,
// and keeping them stable avoids handing useWorkflowEngine a new function
// identity (and therefore a new internal reducer) on every render.
const stepDefinitions: StepDefinition<ProvisioningContext>[] = [
  {
    id: "general-info",
    isValid: (ctx) => generalInfoSchema.safeParse(ctx.general).success,
  },
  {
    id: "network-topology",
    isValid: (ctx) => networkTopologySchema.safeParse(ctx.network).success,
  },
  {
    id: "security-iam",
    isValid: (ctx) => {
      if (!networkTopologySchema.safeParse(ctx.network).success) return false;
      return buildSecuritySchema(ctx.network as NetworkTopologyData).safeParse(
        ctx.security,
      ).success;
    },
  },
  {
    id: "review-submit",
    isValid: () => true,
  },
];

function resolveNextStep(currentStepId: string): string | null {
  const index = STEP_ORDER.indexOf(currentStepId as ProvisioningStepId);
  if (index === -1 || index === STEP_ORDER.length - 1) return null;
  return STEP_ORDER[index + 1];
}

/**
 * Walks the step list in order and only honors `requestedStepId` if every
 * step before it is actually valid in `context`. Otherwise it returns the
 * first incomplete step. This is what stops a hand-edited or cold-shared
 * `?step=review-submit` URL from landing a visitor past validation the
 * engine's own JUMP_TO_STEP guard would otherwise have blocked — that guard
 * only runs on dispatch, and mounting the engine at an arbitrary initial
 * step never goes through dispatch.
 */
function resolveSafeInitialStep(
  requestedStepId: string,
  context: ProvisioningContext,
): string {
  for (const def of stepDefinitions) {
    if (def.id === requestedStepId) return requestedStepId;
    if (!def.isValid(context)) return def.id;
  }
  return STEP_ORDER[0];
}

const EMPTY_CONTEXT: ProvisioningContext = {
  general: {},
  network: {},
  security: {},
};

interface WizardContainerProps {
  workspaceId: string;
}

export function WizardContainer({ workspaceId }: WizardContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seed initial state from the URL exactly once on mount — deep links open
  // at the right step with the right (non-sensitive) fields pre-filled.
  // After mount, the engine owns state and this URL read is never repeated;
  // see the effect below for the other direction (state -> URL).
  const initial = useMemo(() => {
    const parsed = parseParamsToState(searchParams);

    const context: ProvisioningContext = {
      general: {
        environment: sanitizeEnum(
          parsed.fieldValues.environment,
          ALLOWED_ENVIRONMENTS,
        ),
        region: parsed.fieldValues.region,
      },
      network: {
        vpcType: sanitizeEnum(parsed.fieldValues.vpcType, ALLOWED_VPC_TYPES),
        subnetCidr: parsed.fieldValues.subnetCidr,
      },
      security: {},
    };

    const requestedStepId =
      parsed.stepId && STEP_ORDER.includes(parsed.stepId as ProvisioningStepId)
        ? parsed.stepId
        : STEP_ORDER[0];

    return {
      stepId: resolveSafeInitialStep(requestedStepId, context),
      context,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const engine = useWorkflowEngine<ProvisioningContext>({
    steps: stepDefinitions,
    initialStepId: initial.stepId,
    initialContext: { ...EMPTY_CONTEXT, ...initial.context },
    resolveNextStep,
  });

  const draft = useDraftPersistence<ProvisioningContext>({
    workspaceId,
    currentStepId: engine.currentStepId,
    context: engine.context,
    enabled: true,
  });

  // Provisioning + result state lives here (not inside StepReviewSubmission)
  // so the button's `disabled` attribute, the Cmd/Ctrl+Enter shortcut, and
  // the success-view swap all share one source of truth — otherwise the
  // shortcut could fire a second provision call mid-flight, since it
  // doesn't go through the DOM button.
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionResult, setProvisionResult] =
    useState<ProvisioningResult | null>(null);

  // Keep the URL in sync with step + non-sensitive field values, but only
  // while the wizard is still active — once provisioned, the step params
  // are stale and shouldn't keep round-tripping through history.replace.
  useEffect(() => {
    if (provisionResult) return;
    const flatFields = {
      environment: engine.context.general.environment,
      region: engine.context.general.region,
      vpcType: engine.context.network.vpcType,
      subnetCidr: engine.context.network.subnetCidr,
    };
    const params = serializeStateToParams(engine.currentStepId, flatFields);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [engine.currentStepId, engine.context, pathname, router, provisionResult]);

  const handleRestoreDraft = () => {
    const restored = draft.restoreDraft();
    if (!restored) return;
    engine.updateContext(restored.context);
    engine.jumpToStep(restored.stepId);
  };

  const handleStepValidSubmit = (patch: Partial<ProvisioningContext>) => {
    // Dispatched synchronously in the same handler: React resolves multiple
    // dispatches to the same reducer in order, so NEXT's validity check
    // already sees the freshly-merged context from this update.
    engine.updateContext(patch);
    engine.next();
  };

  const isFirstStep = engine.currentStepIndex === 0;
  const isReviewStep = engine.currentStepId === "review-submit";

  const handleProvision = useCallback(async () => {
    if (isProvisioning) return;
    setIsProvisioning(true);
    setProvisionError(null);
    try {
      const result = await submitProvisioningRequest(engine.context);
      draft.clearSavedDraft();
      setProvisionResult(result);
    } catch (err) {
      const message =
        err instanceof ProvisioningError
          ? err.message
          : "Provisioning failed. Check the details below and try again.";
      setProvisionError(message);
    } finally {
      setIsProvisioning(false);
    }
  }, [isProvisioning, engine.context, draft]);

  const handleProvisionAnother = useCallback(() => {
    setProvisionResult(null);
    setProvisionError(null);
    engine.updateContext(EMPTY_CONTEXT);
    engine.jumpToStep(STEP_ORDER[0]);
    draft.dismissDraft();
  }, [engine, draft]);

  useWizardKeyboardShortcut({
    formId: !isReviewStep ? `step-${engine.currentStepId}` : undefined,
    onShortcut: isReviewStep && !provisionResult ? handleProvision : undefined,
  });

  // Move focus to the new step's (or the success view's) heading on
  // transition, so screen reader users aren't left stranded on the old
  // Continue/Provision button after the DOM beneath it swaps out. Skipped
  // on the very first render so mounting the page doesn't yank focus away
  // from wherever the user actually landed.
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (provisionResult) {
      successHeadingRef.current?.focus();
    } else {
      stepHeadingRef.current?.focus();
    }
  }, [engine.currentStepId, provisionResult]);

  if (provisionResult) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <ProvisionSuccess
          result={provisionResult}
          workspaceId={workspaceId}
          onProvisionAnother={handleProvisionAnother}
          headingRef={successHeadingRef}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {draft.pendingDraft && (
        <div className="mb-6 flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <span className="text-warning">
            You have an unfinished setup from{" "}
            {new Date(draft.pendingDraft.savedAt).toLocaleString()}.
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="font-medium text-warning underline underline-offset-2"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={draft.dismissDraft}
              className="text-warning/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between">
        <WizardStepper
          currentStepId={engine.currentStepId}
          stepStatus={engine.stepStatus}
          history={engine.history}
          onStepSelect={(stepId) => engine.jumpToStep(stepId)}
        />
      </div>
      {draft.isSaving && (
        <p
          className="-mt-6 mb-6 text-right text-xs text-fg-muted"
          aria-hidden="true"
        >
          Saving draft…
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <div aria-live="polite" className="sr-only">
          {`Step ${engine.currentStepIndex + 1} of ${STEP_ORDER.length}: ${STEP_LABELS[engine.currentStepId as ProvisioningStepId]}`}
        </div>
        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          className="mb-6 text-base font-semibold text-foreground focus:outline-none"
        >
          {STEP_LABELS[engine.currentStepId as ProvisioningStepId]}
        </h2>

        {engine.currentStepId === "general-info" && (
          <StepGeneralConfig
            defaultValues={engine.context.general}
            onValidSubmit={(data) => handleStepValidSubmit({ general: data })}
          />
        )}

        {engine.currentStepId === "network-topology" && (
          <StepNetworkConfig
            defaultValues={engine.context.network}
            onValidSubmit={(data) => handleStepValidSubmit({ network: data })}
          />
        )}

        {engine.currentStepId === "security-iam" && (
          <StepSecurityConfig
            defaultValues={engine.context.security}
            networkContext={engine.context.network as NetworkTopologyData}
            onValidSubmit={(data) => handleStepValidSubmit({ security: data })}
          />
        )}

        {isReviewStep && (
          <StepReviewSubmission
            context={engine.context}
            isSubmitting={isProvisioning}
            submitError={provisionError}
            onSubmit={handleProvision}
          />
        )}
      </div>

      {!isReviewStep && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => engine.previous()}
            disabled={isFirstStep}
            className="rounded-md px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="submit"
            form={`step-${engine.currentStepId}`}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Continue
            <span
              aria-hidden="true"
              className="hidden items-center gap-0.5 rounded border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-normal text-fg-muted sm:inline-flex"
            >
              ⌘⏎
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

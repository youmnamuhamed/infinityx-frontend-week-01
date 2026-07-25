// src/core/hooks/useWorkflowEngine.ts
import { useReducer, useCallback, useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────

/**
 * A single step in the workflow. TContext is the shape of the
 * accumulated form data across ALL steps (generic, so this file
 * never needs to know about "VPC" or "IAM" — that's the caller's job).
 */
export interface StepDefinition<TContext> {
  id: string;
  /**
   * Returns true if the data currently in context is valid enough
   * to leave this step. This stays synchronous at the engine level —
   * async Zod validation happens in the form layer and reports its
   * result back into context (more on this when we build the schemas).
   */
  isValid: (context: TContext) => boolean;
}

/**
 * Given the CURRENT step and the current context, decide what the
 * next step should be. This is what makes branching possible:
 * it's a function, not a fixed array index.
 */
export type StepResolver<TContext> = (
  currentStepId: string,
  context: TContext,
) => string | null; // null = no next step (end of workflow)

interface WorkflowState<TContext> {
  currentStepId: string;
  context: TContext;
  /** Stack of previously visited step ids, for PREVIOUS and breadcrumb rendering */
  history: string[];
  /** Tracks whether each visited step passed validation, for the stepper UI */
  stepStatus: Record<string, "valid" | "invalid" | "untouched">;
}

type WorkflowAction<TContext> =
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "JUMP_TO_STEP"; stepId: string }
  | { type: "RESET" }
  | { type: "UPDATE_CONTEXT"; patch: Partial<TContext> };

export interface WorkflowConfig<TContext> {
  steps: StepDefinition<TContext>[];
  initialStepId: string;
  initialContext: TContext;
  resolveNextStep: StepResolver<TContext>;
}

// ── Reducer ──────────────────────────────────────────────────────────

function createReducer<TContext>(
  steps: StepDefinition<TContext>[],
  resolveNextStep: StepResolver<TContext>,
) {
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  return function workflowReducer(
    state: WorkflowState<TContext>,
    action: WorkflowAction<TContext>,
  ): WorkflowState<TContext> {
    switch (action.type) {
      case "NEXT": {
        const currentStep = stepMap.get(state.currentStepId);
        if (!currentStep) return state;

        const isCurrentStepValid = currentStep.isValid(state.context);

        // GUARD: refuse to advance if the current step is invalid.
        // We still record it as 'invalid' so the stepper can show a red state.
        if (!isCurrentStepValid) {
          return {
            ...state,
            stepStatus: {
              ...state.stepStatus,
              [state.currentStepId]: "invalid",
            },
          };
        }

        const nextStepId = resolveNextStep(state.currentStepId, state.context);
        if (!nextStepId) return state; // end of workflow, NEXT does nothing

        return {
          ...state,
          currentStepId: nextStepId,
          history: [...state.history, state.currentStepId],
          stepStatus: {
            ...state.stepStatus,
            [state.currentStepId]: "valid",
          },
        };
      }

      case "PREVIOUS": {
        if (state.history.length === 0) return state; // already at step 1
        const previousStepId = state.history[state.history.length - 1];
        return {
          ...state,
          currentStepId: previousStepId,
          history: state.history.slice(0, -1),
        };
      }

      case "JUMP_TO_STEP": {
        // GUARD: only allow jumping to a step that exists AND that we've
        // already visited (or is the current step). This is what stops
        // someone from hand-editing the URL to `?step=review` and
        // skipping validation entirely.
        const canJump =
          stepMap.has(action.stepId) &&
          (state.history.includes(action.stepId) ||
            action.stepId === state.currentStepId);

        if (!canJump) return state;

        return {
          ...state,
          currentStepId: action.stepId,
          history: state.history.includes(action.stepId)
            ? state.history.slice(0, state.history.indexOf(action.stepId))
            : state.history,
        };
      }

      case "UPDATE_CONTEXT": {
        return {
          ...state,
          context: { ...state.context, ...action.patch },
        };
      }

      case "RESET":
        return {
          currentStepId: steps[0].id,
          context: {} as TContext, // caller resets to initialContext via config, see hook below
          history: [],
          stepStatus: {},
        };

      default:
        return state;
    }
  };
}

// ── Public hook ──────────────────────────────────────────────────────

export function useWorkflowEngine<TContext>(config: WorkflowConfig<TContext>) {
  const reducer = useMemo(
    () => createReducer(config.steps, config.resolveNextStep),
    [config.steps, config.resolveNextStep],
  );

  const [state, dispatch] = useReducer(reducer, {
    currentStepId: config.initialStepId,
    context: config.initialContext,
    history: [],
    stepStatus: {},
  });

  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const previous = useCallback(() => dispatch({ type: "PREVIOUS" }), []);
  const jumpToStep = useCallback(
    (stepId: string) => dispatch({ type: "JUMP_TO_STEP", stepId }),
    [],
  );
  const updateContext = useCallback(
    (patch: Partial<TContext>) => dispatch({ type: "UPDATE_CONTEXT", patch }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const currentStepIndex = config.steps.findIndex(
    (s) => s.id === state.currentStepId,
  );

  return {
    currentStepId: state.currentStepId,
    currentStepIndex,
    context: state.context,
    history: state.history,
    stepStatus: state.stepStatus,
    next,
    previous,
    jumpToStep,
    updateContext,
    reset,
  };
}

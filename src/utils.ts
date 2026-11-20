import type { FormManagerSteps } from "./models";

export function shallowMerge(current: unknown, incoming: unknown): unknown {
  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  if (isPlainObject(incoming) && isPlainObject(current)) {
    return { ...current, ...incoming };
  }
  return incoming;
}

export function isSameCurrentStepData(
  currentState: FormManagerSteps<any>,
  nextState: FormManagerSteps<any>,
): boolean {
  const isCurrentSame =
    currentState.currentStep.index === nextState.currentStep.index &&
    currentState.currentStep.name === nextState.currentStep.name &&
    currentState.currentStep.error === nextState.currentStep.error;
  if (!isCurrentSame) return false;
  if (currentState.steps.length !== nextState.steps.length) return false;
  return !currentState.steps.some(
    (step) => step.error !== nextState.steps.find((next) => next.name === step.name)?.error,
  );
}

export function createBootstrapId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `bootstrap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

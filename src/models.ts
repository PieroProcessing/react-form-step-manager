import type { createFormControl, FieldValues, FormState } from "react-hook-form";
import type { z, ZodObject } from "zod";
import type { AbstractStrategy } from "./strategy";

/** Action checked on a step whose `claim` is set but `action` is not. */
export const DEFAULT_ACTION = "view";

export type Step<
  TSchema extends ZodObject = ZodObject,
  TClaim extends string = string,
  TAction extends string = string,
> = {
  /** Top-level key of the schema. */
  name: keyof z.infer<TSchema> & string;
  id: string;
  /** Claim that governs the step: without the granted action the step does not exist. */
  claim?: TClaim;
  /** Action required on the claim; defaults to `view`. */
  action?: TAction;
};

/** Decisions injected at bootstrap telling which claim/action pairs are granted. */
export type ClaimsResolver<TClaim extends string = string, TAction extends string = string> = {
  claim(id: TClaim): Partial<Record<TAction, boolean>>;
};

/** Result type declared by strategy `S` (fourth generic of `AbstractStrategy`). */
export type SubmitResultOf<S> = S extends AbstractStrategy<any, any, any, infer TResult, any, any>
  ? TResult
  : never;

export type ClaimOf<S> = S extends AbstractStrategy<any, any, any, any, infer TClaim, any>
  ? TClaim
  : never;

export type ActionOf<S> = S extends AbstractStrategy<any, any, any, any, any, infer TAction>
  ? TAction
  : never;

export type FormManagerMetadata = Record<string, unknown>;

export type StepState<TStep extends Step<any, any, any> = Step> = TStep & { error: boolean };

/** Subset of the react-hook-form state tracked by the manager. */
export type FormStatus = Pick<FormState<FieldValues>, "dirtyFields" | "touchedFields"> & {
  values: FieldValues;
};

export type FormManagerSteps<TStep extends Step<any, any, any> = Step> = {
  steps: StepState<TStep>[];
  currentStep: StepState<TStep> & { index: number };
  formStatus: FormStatus | null;
};

export type FormManagerStepListener<TStep extends Step<any, any, any> = Step> = (
  stepsData: FormManagerSteps<TStep>,
) => void;

export type HeadlessFormControl<TValues extends FieldValues = FieldValues> = ReturnType<
  typeof createFormControl<TValues>
>;

export interface BootstrapOptions<TStrategy extends AbstractStrategy<any, any, any, any, any, any>> {
  strategy: TStrategy;
  defaultValues: z.infer<ReturnType<TStrategy["getFormSchema"]>>;
  disabled?: boolean;
  validationMode?: "onChange" | "onSubmit";
  /** Granted claims. Without it no claim is granted. */
  claims?: ClaimsResolver<ClaimOf<TStrategy>, ActionOf<TStrategy>>;
}

/** Strategy constructor carrying user-defined static methods. */
export type StrategyClass<TStrategy, TStatics = {}> = (new (...args: any[]) => TStrategy) & TStatics;

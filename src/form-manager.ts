import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFormControl,
  type DeepPartial,
  type DefaultValues,
  type ErrorOption,
  type FieldPath,
  type FieldValues,
  type KeepStateOptions,
  type Resolver,
} from "react-hook-form";
import { z, type ZodObject, type ZodType } from "zod";
import {
  DEFAULT_ACTION,
  type ActionOf,
  type BootstrapOptions,
  type ClaimOf,
  type FormManagerMetadata,
  type FormManagerStepListener,
  type FormManagerSteps,
  type FormStatus,
  type HeadlessFormControl,
  type Step,
  type StepState,
  type StrategyClass,
  type SubmitResultOf,
} from "./models";
import type { AnyStrategy } from "./strategy";
import { createBootstrapId, shallowMerge } from "./utils";

type SchemaOf<TStrategy extends AnyStrategy> = ReturnType<TStrategy["getFormSchema"]>;
type ValuesOf<TStrategy extends AnyStrategy> = z.infer<SchemaOf<TStrategy>>;
type StepOf<TStrategy extends AnyStrategy> = ReturnType<TStrategy["getSteps"]>[number];
type ClaimDecision<TStrategy extends AnyStrategy> = Partial<Record<ActionOf<TStrategy>, boolean>>;

/** Frozen so that `getClaim` returns the same reference for every unknown claim. */
const NO_CLAIM: Readonly<Record<string, boolean>> = Object.freeze({});

type RhfMember = "setValue" | "getValues" | "resetField" | "trigger" | "unregister" | "reset" | "setError" | "clearErrors" | "handleSubmit";

export type FormControlFacade = Pick<HeadlessFormControl<FieldValues>, RhfMember> & {
  control: HeadlessFormControl<FieldValues>["formControl"];
  options: { mode: "onChange" | "onSubmit"; resolver: Resolver<FieldValues> };
};

export type ReplaceStrategyOptions<TStrategy extends AnyStrategy> = {
  claims?: BootstrapOptions<TStrategy>["claims"];
  defaultValues?: DeepPartial<z.infer<ReturnType<TStrategy["getFormSchema"]>>>;
};

/** Owns one form: its react-hook-form control, current step, claims and listeners. One instance per form. */
export class FormManager<TStrategy extends AnyStrategy = AnyStrategy> {
  private strategy: TStrategy | null = null;
  private bootstrapId: string | null = null;
  private scopeId: string | null = null;
  private revision = "";
  private grants: Record<string, ClaimDecision<TStrategy>> = {};
  private claimsResolver: BootstrapOptions<TStrategy>["claims"];
  private readonly claimsListeners = new Set<() => void>();
  private formStatus: FormStatus | null = null;
  private currentStepIndex = 0;
  private currentStepValid = false;
  private readonly stepsListeners = new Set<FormManagerStepListener<any>>();
  private unsubscribeForm: (() => void) | null = null;
  private headlessForm: HeadlessFormControl<FieldValues> | null = null;
  private resolverOptions: { mode: "onChange" | "onSubmit"; resolver: Resolver<FieldValues> } | null =
    null;

  /** Neutralizes (`z.any()`) the schema of denied steps so their default values survive submit. */
  protected getResolverSchema(): ZodObject {
    const schema = this.getFormSchema() as ZodObject;
    const denied = this.requireStrategy()
      .getDeclaredSteps()
      .filter((step) => !this.isGranted(step));
    if (denied.length === 0) return schema;
    const neutralized = Object.fromEntries(denied.map((step) => [step.name, z.any()]));
    return schema.extend(neutralized);
  }

  private isGranted(step: Step<any, any, any>): boolean {
    if (!step.claim) return true;
    const decision = this.grants[step.claim] as Record<string, boolean> | undefined;
    return decision?.[step.action ?? DEFAULT_ACTION] === true;
  }

  /** Decision taken at bootstrap, stable until the form is rebuilt. Unknown claim or no form = no action. */
  getClaim = (id: ClaimOf<TStrategy>): ClaimDecision<TStrategy> =>
    this.grants[id] ?? (NO_CLAIM as ClaimDecision<TStrategy>);

  subscribeClaims = (listener: () => void): (() => void) => {
    this.claimsListeners.add(listener);
    return () => {
      this.claimsListeners.delete(listener);
    };
  };

  private notifyClaims(): void {
    this.claimsListeners.forEach((listener) => listener());
  }

  private requireStrategy(): TStrategy {
    if (!this.strategy) throw new Error("Strategy not set");
    return this.strategy;
  }

  private requireForm(): HeadlessFormControl<FieldValues> {
    if (!this.headlessForm) throw new Error("Form is not valid");
    return this.headlessForm;
  }

  private isCurrentStepValid(): boolean {
    this.requireForm();
    const currentStep = this.getVisibleSteps()[this.currentStepIndex];
    if (!currentStep) return true;
    return this.validateStep(currentStep);
  }

  private getVisibleSteps(): StepOf<TStrategy>[] {
    return (this.requireStrategy().getSteps() as StepOf<TStrategy>[]).filter((step) =>
      this.isGranted(step),
    );
  }

  private buildCurrentStepInfo<TStep extends Step<any, any, any> = StepOf<TStrategy>>(): FormManagerSteps<TStep> {
    if (!this.strategy) {
      return {
        steps: [],
        currentStep: { name: "", id: "", index: 0, error: true } as FormManagerSteps<TStep>["currentStep"],
        formStatus: null,
      };
    }
    const steps = this.steps as StepState<TStep>[];
    const currentStep = steps[this.currentStepIndex];
    return {
      steps,
      currentStep: { ...currentStep, index: this.currentStepIndex } as FormManagerSteps<TStep>["currentStep"],
      formStatus: this.formStatus,
    };
  }

  get steps(): StepState<StepOf<TStrategy>>[] {
    return this.getVisibleSteps().map((step) => ({
      ...step,
      error: !this.validateStep(step),
    }));
  }

  /**
   * Thin access to the react-hook-form control. Everything here delegates to RHF;
   * the rest of the class is the step logic. Throws before `bootstrap`.
   */
  get form(): FormControlFacade {
    const { setValue, getValues, resetField, trigger, unregister, reset, setError, clearErrors, handleSubmit, formControl } =
      this.requireForm();
    return {
      setValue,
      getValues,
      resetField,
      trigger,
      unregister,
      reset,
      setError,
      clearErrors,
      handleSubmit,
      control: formControl,
      // `useForm({ formControl })` overrides the control options with its own props: pass these again.
      options: this.resolverOptions as NonNullable<typeof this.resolverOptions>,
    };
  }
  getBootstrapId(): string | null {
    return this.bootstrapId;
  }

  /** The constructor of the strategy in use, typed with the statics declared via `StrategyClass`. */
  getStrategyClass<TStatics = {}>(): StrategyClass<TStrategy, TStatics> {
    return this.requireStrategy().constructor as StrategyClass<TStrategy, TStatics>;
  }

  validateStep(step: Step<any, any, any>): boolean {
    return this.getStepIssues(step).length === 0;
  }

  getStepIssues(step: Step<any, any, any>) {
    const values = this.requireForm().getValues(step.name as FieldPath<FieldValues>);
    const stepSchema = this.requireStrategy().getStepSchema(step);
    const validationResult = stepSchema.safeParse(values);
    return validationResult.success ? [] : validationResult.error.issues;
  }

  clearAll(removeListeners = true): void {
    this.strategy?.onDispose();
    this.headlessForm = null;
    this.strategy = null;
    this.bootstrapId = null;
    this.scopeId = null;
    this.revision = "";
    this.grants = {};
    this.claimsResolver = undefined;
    this.currentStepIndex = 0;
    this.currentStepValid = false;
    this.formStatus = null;
    this.notifyClaims();
    if (removeListeners) {
      this.unsubscribeForm?.();
      this.unsubscribeForm = null;
      this.stepsListeners.clear();
    }
  }

  /** Bootstraps the scope unless it is already the active one with the same `revision`: safe to call repeatedly. */
  ensureScope(id: string, factory: () => BootstrapOptions<TStrategy>, revision = ""): void {
    if (this.scopeId === id && this.revision === revision && this.hasCompletedBootstrap()) return;
    this.bootstrap(factory());
    this.scopeId = id;
    this.revision = revision;
  }

  /** Clears only if the active scope is `id`: leaving a page must not wipe the form of the one just opened. */
  clearScope(id: string): void {
    if (this.scopeId === id) this.clearAll();
  }

  resetFormManager(): void {
    this.strategy?.onReset();
    this.bootstrapId = createBootstrapId();
    this.currentStepIndex = 0;
    this.currentStepValid = false;
    this.requireForm().reset();
    this.recomputeCurrentStepValid();
  }

  bootstrap({ strategy, ...options }: BootstrapOptions<TStrategy>): this {
    this.clearAll();

    this.strategy = strategy;
    this.claimsResolver = options.claims;
    this.grants = this.resolveGrants(strategy);
    this.bootstrapId = createBootstrapId();

    const resolver: Resolver<FieldValues> = (...resolverArguments) => {
      const resolve = zodResolver(this.getResolverSchema() as ZodType<FieldValues, FieldValues>);
      return resolve(...(resolverArguments as Parameters<typeof resolve>)) as ReturnType<
        Resolver<FieldValues>
      >;
    };
    this.resolverOptions = { mode: options.validationMode ?? "onChange", resolver };
    this.headlessForm = createFormControl<FieldValues>({
      ...this.resolverOptions,
      defaultValues: options.defaultValues as DefaultValues<FieldValues>,
      disabled: options.disabled,
    });
    this.currentStepIndex = 0;
    this.currentStepValid = this.isCurrentStepValid();

    this.unsubscribeForm = this.headlessForm.subscribe({
      formState: { dirtyFields: true, touchedFields: true, values: true },
      callback: (data) => {
        this.formStatus = data as FormStatus;
        this.recomputeCurrentStepValid();
      },
    });
    this.notifyClaims();
    return this;
  }

  private resolveGrants(strategy: TStrategy): Record<string, ClaimDecision<TStrategy>> {
    return Object.fromEntries(
      strategy
        .getClaims()
        .map((id: string) => [id, this.claimsResolver?.claim(id as ClaimOf<TStrategy>) ?? NO_CLAIM]),
    );
  }

  /**
   * Swaps the strategy keeping the RHF control (values, dirty, touched), the listeners, the bootstrap id
   * and the current step (matched by name). If that step no longer exists, falls back to the closest
   * previous step that still exists, otherwise to the first one. Then revalidates the whole form.
   * Claims: `options.claims` replaces the resolver; without it the current one is reused.
   * `options.defaultValues` only fills top-level keys that are still `undefined` (e.g. steps new to the schema).
   */
  replaceStrategy(strategy: TStrategy, options: ReplaceStrategyOptions<TStrategy> = {}): this {
    const form = this.requireForm();
    const previousVisibleNames = this.getVisibleSteps().map((step) => step.name);
    const previousIndex = this.currentStepIndex;

    for (const [key, value] of Object.entries(options.defaultValues ?? {})) {
      if (form.getValues(key as FieldPath<FieldValues>) === undefined) {
        form.setValue(key as FieldPath<FieldValues>, value);
      }
    }

    this.strategy?.onDispose();
    this.strategy = strategy;
    if (options.claims) this.claimsResolver = options.claims;
    this.grants = this.resolveGrants(strategy);

    const visibleNames = this.getVisibleSteps().map((step) => step.name as string);
    const candidates = previousVisibleNames.slice(0, previousIndex + 1).reverse();
    const keptName = candidates.find((name) => visibleNames.includes(name as string));
    this.currentStepIndex = keptName === undefined ? 0 : visibleNames.indexOf(keptName as string);
    this.currentStepValid = this.isCurrentStepValid();

    void form.trigger();
    this.notifyClaims();
    this.callStepListeners();
    return this;
  }

  getFormSchema(): SchemaOf<TStrategy> {
    return this.requireStrategy().getFormSchema();
  }

  getFormStatus(): FormStatus | null {
    return this.formStatus;
  }

  getCurrentStepInfo = <TStep extends Step<any, any, any> = StepOf<TStrategy>>() =>
    this.buildCurrentStepInfo<TStep>();

  recomputeCurrentStepValid(): boolean {
    const nextValid = this.isCurrentStepValid();
    if (nextValid !== this.currentStepValid) {
      this.currentStepValid = nextValid;
      this.callStepListeners();
    }
    return nextValid;
  }

  private callStepListeners(): void {
    const currentStepData = this.buildCurrentStepInfo();
    this.stepsListeners.forEach((listener) => listener(currentStepData));
  }

  subscribeCurrentStepData = (listener: FormManagerStepListener<any>): (() => void) => {
    this.stepsListeners.add(listener);
    return () => {
      this.stepsListeners.delete(listener);
    };
  };

  isLastStep(): boolean {
    return this.currentStepIndex >= this.steps.length - 1;
  }

  getNextStep(): StepState<StepOf<TStrategy>> | null {
    this.requireForm();
    if (this.isLastStep()) return null;
    return this.steps[this.currentStepIndex + 1] ?? null;
  }

  getPrevStep(): StepState<StepOf<TStrategy>> | null {
    if (this.currentStepIndex <= 0) return null;
    return this.steps[this.currentStepIndex - 1] ?? null;
  }

  /** `false`: unknown step. `null`: already on that step. `true`: moved. */
  goToStep(stepName: StepOf<TStrategy>["name"]): boolean | null {
    this.requireForm();
    const steps = this.getVisibleSteps();
    const index = steps.findIndex((step) => step.name === stepName);
    if (index < 0) return false;
    if (index === this.currentStepIndex) return null;
    this.moveToStep(index);
    return true;
  }

  /** Returns the new current step, or `null` when already on the last one. */
  goNext(): StepState<StepOf<TStrategy>> | null {
    this.requireForm();
    if (this.isLastStep()) return null;
    this.moveToStep(this.currentStepIndex + 1);
    return this.steps[this.currentStepIndex] ?? null;
  }

  /** Returns the new current step, or `null` when already on the first one. */
  goPrev(): StepState<StepOf<TStrategy>> | null {
    this.requireForm();
    if (this.currentStepIndex <= 0) return null;
    this.moveToStep(this.currentStepIndex - 1);
    return this.steps[this.currentStepIndex] ?? null;
  }

  private moveToStep(index: number): void {
    this.currentStepIndex = index;
    this.currentStepValid = this.isCurrentStepValid();
    this.callStepListeners();
  }

  getStepIndexByName(stepName: StepOf<TStrategy>["name"]): number {
    return this.getVisibleSteps().findIndex((step) => step.name === stepName);
  }

  /** The manager does not interpret results: it forwards them to `onResult` each time the strategy reports. */
  async submit<TResult = SubmitResultOf<TStrategy>>(onResult?: (result: TResult) => void): Promise<void> {
    const form = this.requireForm();
    const strategy = this.requireStrategy();
    // handleSubmit returns the handler: invoke it. It validates before calling the strategy.
    await form.handleSubmit(async (data) => {
      await strategy.submit(data, (result: unknown) => onResult?.(result as TResult));
    })();
  }

  mergeFormValues(data: DeepPartial<ValuesOf<TStrategy>>, shouldTrigger = false): void {
    const form = this.requireForm();
    for (const key of Object.keys(data)) {
      const incoming = (data as Record<string, unknown>)[key];
      if (incoming === undefined || incoming === null) continue;
      const fieldKey = key as FieldPath<FieldValues>;
      form.setValue(fieldKey, shallowMerge(form.getValues(fieldKey), incoming), {
        shouldDirty: shouldTrigger,
        shouldValidate: shouldTrigger,
      });
    }
  }

  setFieldError(fieldName: string, error: ErrorOption): void {
    this.requireForm().setError(fieldName as FieldPath<FieldValues>, error);
  }

  getFormValues(): ValuesOf<TStrategy> {
    return this.requireForm().getValues() as ValuesOf<TStrategy>;
  }

  getStepFormData<T>(stepName: string): T {
    return this.requireForm().getValues(stepName as FieldPath<FieldValues>) as T;
  }

  getStrategyMetadata<T extends object>(): T {
    return { ...this.requireStrategy().getMetadata<T>() };
  }

  getStrategy(): TStrategy {
    return this.requireStrategy();
  }

  patchMetadata<T extends FormManagerMetadata>(metadata: T): void {
    const strategy = this.requireStrategy();
    strategy.updateMetadata({ ...strategy.getMetadata<T>(), ...metadata });
  }

  updateMetadataAndResetFormFields<T extends FormManagerMetadata>(
    metadata: T,
    data?: { values: DeepPartial<ValuesOf<TStrategy>>; options?: KeepStateOptions },
  ): void {
    const form = this.requireForm();
    this.patchMetadata(metadata);
    const mergedValues = { ...form.getValues(), ...data?.values };
    const { keepValues: _keepValues, ...resetOptions } = data?.options ?? {};
    form.reset(mergedValues, resetOptions);
  }

  hasCompletedBootstrap(): boolean {
    return this.strategy !== null;
  }
}

# API

```ts
import {
  FormManager, AbstractStrategy, FormManagerProvider, StepForm,
  useFormManager, useFormSteps, useFormClaims, useFormControl,
  type Step, type StrategyClass, type BootstrapOptions, type ClaimsResolver,
} from "react-form-step-manager";
```

## FormManager<TStrategy>

`new FormManager<TStrategy>()` — one instance per form.

| Member | Notes |
|---|---|
| `bootstrap(options)` | `{ strategy, defaultValues, disabled?, validationMode?: "onChange" \| "onSubmit", claims? }`. Clears previous state, returns `this`. |
| `replaceStrategy(strategy, { claims?, defaultValues? })` | Swaps the strategy keeping RHF values, listeners, bootstrap id and current step (by name); revalidates. |
| `ensureScope(id, factory, revision?)` | Bootstraps unless `id` and `revision` are already active. |
| `clearScope(id)` | Clears only if `id` is the active scope. |
| `clearAll(removeListeners = true)` / `resetFormManager()` | Fire `onDispose` / `onReset` on the strategy. |
| `steps` | Granted steps, each with `error: boolean`. |
| `goNext()` / `goPrev()` | New step or `null` at the edges. |
| `goToStep(name)` | `true` moved, `null` same step, `false` unknown. |
| `isLastStep()`, `getNextStep()`, `getPrevStep()`, `getStepIndexByName(name)` | |
| `submit(onResult?)` | Validates, then `strategy.submit(data, report)`; `report` forwards to `onResult`. |
| `mergeFormValues(partial, shouldTrigger?)` | Shallow-merges per top-level key. |
| `setFieldError(name, error)`, `getFormValues()`, `getStepFormData(step)` | |
| `getStrategy()`, `getStrategyClass<TStatics>()`, `getStrategyMetadata()`, `patchMetadata()`, `updateMetadataAndResetFormFields()` | |
| `getClaim(id)`, `subscribeClaims(listener)` | Decision for a claim; `{}` when unknown. |
| `getCurrentStepInfo()`, `subscribeCurrentStepData(listener)`, `getFormStatus()`, `getBootstrapId()`, `hasCompletedBootstrap()` | |
| `form` | Namespace for everything delegated to react-hook-form: `setValue, getValues, resetField, trigger, unregister, reset, setError, clearErrors, handleSubmit, control, options`. Throws before `bootstrap`. |

## Provider and hooks

- `<FormManagerProvider manager={manager}>` (multi-step) or `<FormManagerProvider methods={useFormReturn}>` (single page).
- `useFormManager<TStrategy>()` — the manager. Throws outside a provider or in `methods` mode.
- `useFormSteps<TStep>()` — `{ steps, currentStep: { ...step, index, error }, formStatus }`, stable snapshot.
- `useFormClaims<TStrategy>(claimId)` — granted actions of the claim.
- `useFormControl<TValues>()` — `{ control, setValue, setError, trigger }` for `useController`/`useFormState`.
- `<StepForm name id? style? onSubmit?>` — `<form noValidate>` that prevents the default submit.

## Types

- `Step<TSchema, TClaim, TAction>` = `{ name, id, claim?, action? }`.
- `ClaimsResolver<TClaim, TAction>` = `{ claim(id: TClaim): Partial<Record<TAction, boolean>> }`.
- `AbstractStrategy<TSchema, TSubmitData, TMetadata, TSubmitResult, TClaim, TAction>`.
- `StrategyClass<TStrategy, TStatics>` = strategy constructor + statics.
- `SubmitResultOf<S>`, `ClaimOf<S>`, `ActionOf<S>` extract strategy generics.

# react-form-step-manager

Multi-step form manager for React built on [React Hook Form](https://react-hook-form.com) and [Zod](https://zod.dev), with per-step **claims**. One `FormManager` instance per form, a strategy class that declares steps, schema and submit, and hooks that read the instance from context.

## Install

```bash
npm install react-form-step-manager react react-hook-form zod @hookform/resolvers
```

Peer dependencies: `react ^18.3 || ^19`, `react-hook-form ^7.62`, `zod ^4`, `@hookform/resolvers ^5`.

## Quick start

```tsx
import { z } from "zod";
import { useController } from "react-hook-form";
import {
  AbstractStrategy, FormManager, FormManagerProvider, StepForm,
  useFormControl, useFormManager, useFormSteps, type Step,
} from "react-form-step-manager";

const schema = z.object({
  customer: z.object({ name: z.string().min(1) }),
  review: z.object({ confirmed: z.boolean() }),
});
type Values = z.infer<typeof schema>;

class OrderStrategy extends AbstractStrategy<typeof schema, Values> {
  protected readonly steps: readonly Step<typeof schema>[] = [
    { name: "customer", id: "order.customer" },
    { name: "review", id: "order.review" },
  ];
  protected readonly schema = schema;
  protected readonly metadata = {};
  async submit(data: Values) { await save(data); }
}

const manager = new FormManager<OrderStrategy>().bootstrap({
  strategy: new OrderStrategy(),
  defaultValues: { customer: { name: "" }, review: { confirmed: false } },
});

function Wizard() {
  const manager = useFormManager<OrderStrategy>();
  const { currentStep } = useFormSteps();
  const { control } = useFormControl();
  const { field } = useController({ control, name: "customer.name" });
  return (
    <StepForm name={currentStep.name} id={currentStep.id} onSubmit={() => manager.submit()}>
      {currentStep.name === "customer" && <input {...field} />}
      {manager.isLastStep() ? <button type="submit">Submit</button> : <button type="button" onClick={() => manager.goNext()}>Next</button>}
    </StepForm>
  );
}

export const App = () => (
  <FormManagerProvider manager={manager}><Wizard /></FormManagerProvider>
);
```

Bootstrap the manager **before** rendering the provider.

## API summary

| Export | Purpose |
|---|---|
| `FormManager<TStrategy>` | Owns one form: RHF control, current step, claims, listeners. `new FormManager()`; no singleton. |
| `AbstractStrategy<TSchema, TSubmitData, TMetadata, TSubmitResult, TClaim, TAction>` | Declares `steps`, `schema`, `metadata`, `submit`, hooks `onReset`/`onDispose`. |
| `FormManagerProvider` | `manager={...}` (multi-step) or `methods={useForm(...)}` (single page). |
| `useFormManager()` | The manager from context; throws outside a provider. |
| `useFormSteps()` | `{ steps, currentStep, formStatus }` with a stable snapshot. |
| `useFormClaims(id)` | Actions granted on a claim. |
| `useFormControl()` | `{ control, setValue, setError, trigger }`. |
| `StepForm` | `<form noValidate>` that prevents the default submit. |
| `Step`, `StrategyClass`, `BootstrapOptions`, `ClaimsResolver` | Types. |

Key behaviours:

- **Claims**: a step with `claim` (and `action`, default `view`) exists only if `bootstrap({ claims })` grants it. A denied step is absent from `steps` and its schema is neutralized so its default values survive submit.
- **Navigation**: `goNext()`/`goPrev()` return `null` at the edges; `goToStep(name)` returns `true`/`null`/`false` (moved / already there / unknown).
- **Submit**: validates first; the strategy may call `report` many times.
- **Scope**: `ensureScope(id, factory, revision)` is idempotent; `clearScope(id)` clears only the active scope.
- The schema root must be a `ZodObject`; each top-level key is a step.

Full reference: [`ai/skills/react-form-step-manager/references/api.md`](ai/skills/react-form-step-manager/references/api.md).

## Bootstrap id

`manager.getBootstrapId()` returns an id (UUID, with a fallback for non-secure contexts) regenerated on every `bootstrap()` and every `resetFormManager()`, and `null` after `clearAll()`. It identifies one *generation* of the form: same id means same RHF control and same strategy instance state.

Use it as a React `key` to remount the provider (and everything below) when the form is rebuilt, and to discard stale async work started for a previous generation.

```tsx
<FormManagerProvider key={manager.getBootstrapId()} manager={manager}>...</FormManagerProvider>
```

## When an input change must change the strategy

Pick the lightest option that fits.

| Input change affects | Do | Control / id | Current step |
|---|---|---|---|
| Only values | `manager.mergeFormValues(partial)` or `form.setValue` | kept / kept | kept |
| Metadata the strategy reads (and some values) | `manager.updateMetadataAndResetFormFields(metadata, { values })` | kept / kept | kept |
| Everything back to defaults | `manager.resetFormManager()` | kept / **new id** | back to first step |
| Steps, schema or claims, **keeping typed values and current step** | `manager.replaceStrategy(new OtherStrategy(), { claims?, defaultValues? })` | kept / kept | kept by name |
| Steps, schema or claims, from scratch (different strategy) | `manager.bootstrap({ strategy: new OtherStrategy(), defaultValues, claims })` | **new** / **new id** | back to first step |
| A claim decision (permissions changed) | `ensureScope(id, factory, newRevision)` | **new** / **new id** | back to first step |

`replaceStrategy` details:

- Keeps the RHF control (values, dirty, touched), step listeners, provider and `bootstrapId`: no remount needed.
- The old strategy gets `onDispose()`. Claims: `options.claims` replaces the resolver; if omitted the current one is reused and granted actions are recomputed for the new strategy's claims.
- Current step is matched by `name`; if it no longer exists it falls back to the closest previous surviving step, else the first.
- `options.defaultValues` only fills top-level keys still `undefined` (steps new to the schema); it never overwrites user input.
- The whole form is revalidated (`trigger()`) against the new schema, so new steps may show errors immediately. Keys removed from the schema stay in RHF but are stripped at submit.

Notes on rebuilding (`bootstrap`, `ensureScope` with a new revision):

- The previous strategy gets `onDispose()` and the step listeners are dropped, so remount the provider with `key={manager.getBootstrapId()}` (see `examples/11-strategy-change.tsx`).
- Carry over what the user already typed by passing it in `defaultValues` (e.g. `manager.getFormValues()`); keys of steps that no longer exist stay in the form values only if you pass them.
- `resetFormManager()` calls `onReset()` on the same strategy; `bootstrap()` calls `onDispose()` on the old one.

## Step validation

Each step is validated against its own slice of the schema: `schema.shape[step.name]` parsed with the current value of that key.

- `manager.steps[i].error` / `useFormSteps().steps[i].error` is `true` when the step has issues; `currentStep.error` is the same for the current step. Use it for steppers and to disable "Next".
- `manager.validateStep(step)` returns a boolean; `manager.getStepIssues(step)` returns the Zod issues.
- The current step is re-evaluated on every form change and on navigation; listeners are notified only when its validity (or the current step) actually changes, so `useFormSteps` does not re-render on every keystroke.
- `goNext`/`goPrev`/`goToStep` do **not** block on invalid steps: gate them yourself with `currentStep.error`.
- `validationMode` (`"onChange"` default, or `"onSubmit"`) controls when RHF populates field errors (`fieldState.error`). The step `error` flag is always computed from the schema.
- `submit()` validates the **whole** form through the resolver (all steps) before calling `strategy.submit`; if invalid it does nothing and RHF fills the field errors.
- Steps denied by claims are not validated and are absent from `steps`; their values still reach `strategy.submit`.
- The schema must be a `ZodObject` whose top-level keys are the step names; cross-step rules (`superRefine` on the root) are enforced at submit, not in per-step `error`.

## Scenarios

Every scenario is a type-checked file in [`examples/`](examples) (`npm run typecheck`).

### 1. Basic 3-step wizard — `examples/01-basic-wizard.tsx`
Strategy with three steps, `useFormSteps` for the stepper, `isLastStep()` to switch Next/Submit.

### 2. Submit with multiple reports — `examples/02-submit-reports.ts`
```ts
await manager.submit((result) => statuses.push(result.status)); // pending, then success
```

### 3. Steps gated by claims — `examples/03-claims.ts`
```ts
const claims: ClaimsResolver<"orders.details", "view" | "update"> = { claim: () => ({ view: true }) };
manager.bootstrap({ strategy, defaultValues, claims });
```

### 4. Several forms on one page — `examples/04-multiple-forms.tsx`
One manager and one provider per form; state is isolated.

### 5. Single page form, no steps — `examples/05-single-page.tsx`
```tsx
<FormManagerProvider methods={useForm({ defaultValues })}>...</FormManagerProvider>
```

### 6. Strategy with static methods — `examples/06-strategy-statics.ts`
```ts
const strategyClass = manager.getStrategyClass<{ createPayload(values: Values): Payload }>();
```

### 7. Testing without React — `examples/07-testing.ts`
Bootstrap a manager and call `goNext`, `submit`, `steps` directly.

### 8. Scoping across routes — `examples/08-scopes.ts`
`ensureScope` in the loader, `clearScope` on leave.

### 9. `switch`/`case` rendering — `examples/09-switch-rendering.tsx`
```tsx
switch (currentStep.name) { case "customer": return <CustomerStep />; ... }
```

### 10. TanStack Router file-based routes — `examples/10-tanstack-router.tsx`
One route per step (`/form/$step`); URL → `goToStep`, manager → `navigate`.

### 11. Changing strategy from an input — `examples/11-strategy-change.tsx`
Metadata/values change vs. full re-bootstrap, remounting the provider with the bootstrap id.

## AI assistants

```bash
npx react-form-step-manager install-skill            # ./.agents/skills
npx react-form-step-manager install-skill --target claude   # ./.claude/skills
npx react-form-step-manager install-skill --target <path> --force
```

Also shipped: `ai/AGENTS.md` (snippet for your `AGENTS.md`/`CLAUDE.md`) and `llms.txt`.

## Development

```bash
npm run typecheck
npm test        # vitest, in band
npm run build
```

## Attribution

Licensed under the Apache License 2.0 (see `LICENSE` and `NOTICE`). Copyright 2026 PieroProcessing. If you use this library in a product, a credit is appreciated, for example:

> Multi-step forms powered by react-form-step-manager by PieroProcessing.

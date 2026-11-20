---
name: react-form-step-manager
description: Build multi-step React forms with react-form-step-manager (React Hook Form + Zod). Use when creating or changing a FormManager, AbstractStrategy, FormManagerProvider, useFormSteps/useFormClaims/useFormControl hooks, claim-gated steps, or tests of a form strategy.
---

# react-form-step-manager

Library for multi-step forms: one `FormManager` instance per form, a user `AbstractStrategy` subclass that declares steps, schema, claims and `submit`, and React hooks reading the instance from context.

## Workflow

1. Define a root `z.object` schema. Each top-level key is one step.
2. Subclass `AbstractStrategy` (see `references/strategy.md`): `steps`, `schema`, `metadata`, `submit`, optional `onReset`/`onDispose`.
3. Create `new FormManager<MyStrategy>()` (never a module singleton shared between forms) and call `bootstrap({ strategy, defaultValues, claims })` **before** rendering the provider. Use `ensureScope`/`clearScope` for route-driven lifecycles.
4. Wrap the UI in `<FormManagerProvider manager={manager}>`; read state with `useFormSteps`, `useFormClaims`, `useFormControl`, `useFormManager`.
5. Render each step with `<StepForm name id>`; navigate with `manager.goNext/goPrev/goToStep`; submit with `manager.submit(onResult)`.

## Rules

- Schema root must be a `ZodObject`; `Step.name` is one of its keys.
- A step with `claim` exists only if `claims.claim(step.claim)[step.action ?? "view"] === true`. Denied steps are absent from `steps`, but their values survive submit.
- `goNext`/`goPrev` return `null` at the edges; `goToStep` returns `false` (unknown), `null` (already there), `true` (moved).
- `submit` validates first; the strategy may call `report` many times (pending, then final).
- Single page forms: `useForm` + `<FormManagerProvider methods={methods}>`; `useFormManager` throws there.
- Keep types narrow: declare `TClaim`/`TAction` unions on the strategy instead of `string`.
- Test strategies without React (`references/testing.md`). Run tests in band.

## References

- `references/api.md` — full public API
- `references/strategy.md` — writing strategies, statics via `StrategyClass`
- `references/claims.md` — claims and gating
- `references/testing.md` — testing without React and with hooks
- `references/recipes.md` — wizard, multi-form page, switch/case rendering, TanStack Router

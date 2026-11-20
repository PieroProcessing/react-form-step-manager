# ReactFormStepManager — Design

Standalone, framework-agnostic library that formalizes the multi-step form manager built on React Hook Form (RHF) and Zod. Derived from `AE.Orbiter/frontend/src/core/form-manager`, which is **read-only reference: Orbiter is never modified and the library has no dependency on it**.

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Instance model | No singleton. Public `FormManager` class, a `FormManagerProvider` that injects an instance in React context, hooks that read the instance from context. |
| 2 | Per-step permissions | Kept, generic. Renamed **claims**: `Step.claim`, `Step.action`, `bootstrap({ claims })`, `useFormClaims`. Claim/action types are generics declared on the strategy. No auth dependency. |
| 3 | Scope v1 | Engine (`FormManager`, `AbstractStrategy`, provider, hooks, types) + `StepForm` (ex `CustomForm`). Out: `ExtendedStrategy` stubs, `ZOD_VALIDATIONS`. |
| 4 | Strategy statics | `StrategyClass<TStrategy, TStatics>` type + `manager.getStrategyClass()` returning the strategy constructor with typed statics. Documented as a pattern, no throwing stubs. |
| 5 | Compatibility | Peer deps: `react ^18.3 \|\| ^19`, `react-hook-form ^7.62`, `zod ^4`, `@hookform/resolvers ^5`. Build tsup (ESM+CJS+d.ts). Tests Vitest, run in band (`--no-file-parallelism --maxWorkers=1`). |
| 6 | License | Apache-2.0 + `NOTICE`; copyright holder **PieroProcessing**. README "Attribution" section with suggested credit text. |
| 7 | AI docs | `ai/` shipped in the npm package: `skills/react-form-step-manager/SKILL.md` + `references/`, `ai/AGENTS.md` snippet, root `llms.txt`, CLI `npx react-form-step-manager install-skill`. |
| 8 | Language | English only (code, comments, docs). |
| 9 | Package name | `react-form-step-manager`. |

## Glossary

- **FormManager**: class owning one form's RHF control, current step, claims and listeners. One instance per form.
- **Strategy**: user subclass of `AbstractStrategy` declaring steps, schema, metadata, `submit`, lifecycle hooks (`onReset`, `onDispose`).
- **Step**: `{ name, id, claim?, action? }`; `name` is a top-level key of the schema.
- **Claims**: decisions injected at bootstrap telling which claim/action pairs are granted. A step whose claim is not granted is absent from `steps` and its schema is neutralized (`z.any()`) in the resolver so its default values survive submit.
- **Scope**: id under which `ensureScope` bootstraps; `clearScope(id)` disposes only if still active.
- **Report**: callback given to `strategy.submit`; may be called many times (pending, then final).
- **StrategyClass**: strategy constructor type carrying user-defined static methods.

## Public API (target)

```ts
import {
  FormManager, AbstractStrategy, FormManagerProvider, StepForm,
  useFormManager, useFormSteps, useFormClaims, useFormControl,
  type Step, type StrategyClass, type BootstrapOptions, type ClaimsResolver,
} from "react-form-step-manager";
```

- `new FormManager<TStrategy>()` (constructor public). Methods carried over from the source: `bootstrap`, `ensureScope`, `clearScope`, `clearAll`, `resetFormManager`, `goNext/goPrev/goToStep`, `isLastStep`, `getNextStep/getPrevStep`, `submit`, `mergeFormValues`, `setFieldError`, `getFormValues`, `getStepFormData`, metadata helpers, `subscribeCurrentStepData`, `getCurrentStepInfo`. New: `getStrategyClass()`.
- `ClaimsResolver<TClaim extends string, TAction extends string>`: `{ claim(id: TClaim): Partial<Record<TAction, boolean>> }`. Default action `view`.
- Hooks (`useFormSteps` = ex `useFormManagerSubscriber`, `useFormControl` = ex `useFormManagerControl`) take the manager from context; throw a clear error outside a provider.
- `FormManagerProvider` accepts `manager` (multi-step with its own RHF control) or `methods` (single page, from `useForm`). The step-based provider calls `useForm({ formControl, ...formOptions })`.
- Narrow typing everywhere (no wide `any`; `Pick` of allowed fields over `Partial`).

## Known issues in the source to fix while porting

- `models.ts` imports `PermissionAction`/`WidgetAccess` from Orbiter: replace with generics.
- Provider `useMemo(..., [])` ignores changes of `control`: depend on the instance.
- `formStatus: any` typed from RHF `FormState`.
- Typo `getBoostrapId`: keep `getBootstrapId`.
- `getStepSchema` assumes `schema.shape[step.name]`; keep, document that the schema root is `ZodObject`.
- `goNext/goPrev` have no bounds check: return `null` at the edges.
- `crypto.randomUUID` fallback for non-secure contexts.

## Repository layout

```
src/            core (form-manager.ts, strategy.ts, models.ts, utils.ts), react (context, hooks, StepForm)
bin/            install-skill CLI
ai/             SKILL.md, references/, AGENTS.md
examples/       scenarios as runnable files (see below)
tests/          Vitest (ported suites: submit, scope, claims)
docs/superpowers/{specs,plans}
README.md  LICENSE  NOTICE  llms.txt  package.json  tsup.config.ts
```

## Documentation

README: install, quick start, API summary, Attribution. Scenarios (each with code):

1. Basic 3-step wizard.
2. Submit with multiple `report` (pending → final).
3. Steps gated by claims.
4. Several forms on one page (separate instances).
5. Single-page form, no steps (`methods`).
6. Strategy with static methods (`StrategyClass`).
7. Testing a strategy/manager without React.
8. Scoping with `ensureScope`/`clearScope` across routes.
9. Rendering steps with a `switch`/`case` on `currentStep.name`.
10. File-based routing with TanStack Router: one route per step (`/form/$step`), `goToStep` synced with `navigate`.

## Testing

Port existing submit/scope/access tests to the instance model; add: multiple instances isolated, hooks outside provider throw, goNext/goPrev bounds, claims generics type tests (`expectTypeOf`), CLI copies skill. Always run in band.

## Out of scope

Validators, backend payload helpers, i18n, UI components, any change to Orbiter.

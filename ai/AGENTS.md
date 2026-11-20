# react-form-step-manager — agent instructions

Add this snippet to your `AGENTS.md` / `CLAUDE.md`:

```md
## Forms

Multi-step forms use `react-form-step-manager` (React Hook Form + Zod).

- One `FormManager` instance per form; no shared singleton. Bootstrap it before rendering `<FormManagerProvider manager={manager}>`.
- Steps, schema, claims and `submit` live in an `AbstractStrategy` subclass. The schema root is a `z.object`; each top-level key is a step.
- Gate steps with `claim`/`action` and inject decisions through `bootstrap({ claims })`.
- Use `useFormSteps`, `useFormClaims`, `useFormControl`, `useFormManager`; render steps with `<StepForm>`.
- Keep `TClaim`/`TAction` unions narrow on the strategy.
- Run tests in band: `npx vitest run --no-file-parallelism --maxWorkers=1`.
- Full skill: `npx react-form-step-manager install-skill`.
```

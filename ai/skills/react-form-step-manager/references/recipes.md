# Recipes

Runnable versions live in the repository `examples/` folder (type-checked in CI).

1. **Wizard**: `examples/01-basic-wizard.tsx`
2. **Multiple reports on submit**: `examples/02-submit-reports.ts`
3. **Claim-gated steps**: `examples/03-claims.ts`
4. **Several forms on one page**: one `FormManager` + one `FormManagerProvider` each: `examples/04-multiple-forms.tsx`
5. **Single page form**: `examples/05-single-page.tsx`
6. **Strategy statics**: `examples/06-strategy-statics.ts`
7. **Testing without React**: `examples/07-testing.ts`
8. **Scopes across routes**: `ensureScope` on enter, `clearScope` on leave: `examples/08-scopes.ts`
9. **switch/case rendering**: `examples/09-switch-rendering.tsx`
10. **TanStack Router, one route per step** (`/form/$step`), `goToStep` synced with `navigate`: `examples/10-tanstack-router.tsx`

Pattern for step components: read the current step with `useFormSteps`, render the matching component inside `<StepForm name={currentStep.name} id={currentStep.id}>`, and bind inputs with `useController({ control, name })` using `control` from `useFormControl`.

# Writing a strategy

```ts
import { z } from "zod";
import { AbstractStrategy, type Step } from "react-form-step-manager";

const schema = z.object({
  info: z.object({ name: z.string().min(1) }),
  review: z.object({ confirmed: z.boolean() }),
});
type Values = z.infer<typeof schema>;
type SubmitStatus = { status: "pending" | "success" | "error" };

class OnboardingStrategy extends AbstractStrategy<
  typeof schema, Values, { identity: string }, SubmitStatus, "onboarding.review", "view" | "update"
> {
  protected readonly steps: readonly Step<typeof schema, "onboarding.review", "view" | "update">[] = [
    { name: "info", id: "onboarding.info" },
    { name: "review", id: "onboarding.review", claim: "onboarding.review", action: "update" },
  ];
  protected readonly schema = schema;
  protected readonly metadata = { identity: "onboarding" };

  async submit(data: Values, report: (result: SubmitStatus) => void) {
    report({ status: "pending" });
    await save(data);
    report({ status: "success" });
  }
  override onReset() { /* release in-flight work */ }
  override onDispose() { /* release subscriptions */ }
}
```

Generics: `TSchema` (root `ZodObject`), `TSubmitData` (validated data), `TMetadata`, `TSubmitResult` (what `report` receives), `TClaim`, `TAction`.

- `protected claims` lists claims used outside steps (e.g. sections inside a step); `getClaims()` merges them with the step claims.
- `getStepSchema(step)` returns `schema.shape[step.name]`.

## Statics with StrategyClass

```ts
type OnboardingStatics = { createPayload(values: Values): Payload };
const strategyClass = manager.getStrategyClass<OnboardingStatics>();
strategyClass.createPayload(manager.getFormValues());
```

Declare the statics on the class (`static createPayload(...)`); `StrategyClass` only types them. No throwing stubs.

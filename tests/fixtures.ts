import { z } from "zod";
import { AbstractStrategy } from "../src";
import type { ClaimsResolver, Step } from "../src";

export const wizardSchema = z.object({
  info: z.object({ name: z.string().min(1) }),
  details: z.object({ note: z.string().min(1) }),
  review: z.object({ confirmed: z.boolean() }),
});

export type WizardValues = z.infer<typeof wizardSchema>;
export type WizardClaim = "wizard.details" | "wizard.review";
export type WizardAction = "view" | "update";
export type WizardResult = { status: "pending" | "success" };

export class WizardStrategy extends AbstractStrategy<
  typeof wizardSchema,
  WizardValues,
  { identity: string },
  WizardResult,
  WizardClaim,
  WizardAction
> {
  protected readonly steps: readonly Step<typeof wizardSchema, WizardClaim, WizardAction>[] = [
    { name: "info", id: "info" },
    { name: "details", id: "details", claim: "wizard.details", action: "update" },
    { name: "review", id: "review" },
  ];
  protected readonly schema = wizardSchema;
  protected readonly metadata = { identity: "test" };
  readonly submitted: WizardValues[] = [];
  disposed = 0;
  resets = 0;

  submit(data: WizardValues, report: (result: WizardResult) => void) {
    this.submitted.push(data);
    report({ status: "pending" });
    report({ status: "success" });
  }
  override onReset() {
    this.resets += 1;
  }
  override onDispose() {
    this.disposed += 1;
  }
}

export const validValues: WizardValues = {
  info: { name: "Ada" },
  details: { note: "hello" },
  review: { confirmed: true },
};

export const grantAll: ClaimsResolver<WizardClaim, WizardAction> = {
  claim: () => ({ view: true, update: true }),
};

export const grantNothing: ClaimsResolver<WizardClaim, WizardAction> = { claim: () => ({}) };

export function wizardOptions(
  overrides: { values?: WizardValues; claims?: ClaimsResolver<WizardClaim, WizardAction> } = {},
) {
  return {
    strategy: new WizardStrategy(),
    defaultValues: overrides.values ?? validValues,
    claims: overrides.claims,
  };
}

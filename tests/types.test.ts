import { describe, expectTypeOf, it } from "vitest";
import {
  FormManager,
  type BootstrapOptions,
  type ClaimsResolver,
  type StrategyClass,
  type SubmitResultOf,
} from "../src";
import { wizardOptions, type WizardAction, type WizardClaim, type WizardResult, type WizardStrategy } from "./fixtures";

describe("generic typing", () => {
  it("claims resolver is typed by the strategy claims and actions", () => {
    type Options = BootstrapOptions<WizardStrategy>;
    expectTypeOf<NonNullable<Options["claims"]>>().toEqualTypeOf<ClaimsResolver<WizardClaim, WizardAction>>();
    expectTypeOf<ClaimsResolver<WizardClaim, WizardAction>["claim"]>().returns.toEqualTypeOf<
      Partial<Record<WizardAction, boolean>>
    >();
  });

  it("submit forwards the result type declared by the strategy", () => {
    expectTypeOf<SubmitResultOf<WizardStrategy>>().toEqualTypeOf<WizardResult>();
  });

  it("getStrategyClass carries the declared statics", () => {
    const manager = new FormManager<WizardStrategy>().bootstrap(wizardOptions());
    const strategyClass = manager.getStrategyClass<{ label(): string }>();
    expectTypeOf(strategyClass).toEqualTypeOf<StrategyClass<WizardStrategy, { label(): string }>>();
    expectTypeOf(strategyClass.label).returns.toBeString();
  });
});

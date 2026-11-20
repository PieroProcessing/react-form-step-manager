import { describe, expect, it, vi } from "vitest";
import { FormManager } from "../src";
import { grantAll, grantNothing, validValues, WizardStrategy, wizardOptions } from "./fixtures";

const createManager = () => new FormManager<WizardStrategy>();

describe("FormManager.submit", () => {
  it("calls the strategy with valid data and forwards every reported result", async () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    const results: unknown[] = [];
    await manager.submit((result) => results.push(result));
    expect(results).toEqual([{ status: "pending" }, { status: "success" }]);
    expect(manager.getStrategy().submitted).toEqual([validValues]);
  });

  it("does not call the strategy when the form is invalid", async () => {
    const manager = createManager().bootstrap(
      wizardOptions({ claims: grantAll, values: { ...validValues, info: { name: "" } } }),
    );
    const onResult = vi.fn();
    await manager.submit(onResult);
    expect(onResult).not.toHaveBeenCalled();
    expect(manager.getStrategy().submitted).toHaveLength(0);
  });

  it("resetFormManager and clearAll trigger the strategy hooks", () => {
    const manager = createManager().bootstrap(wizardOptions());
    const strategy = manager.getStrategy();
    manager.resetFormManager();
    expect(strategy.resets).toBe(1);
    manager.clearAll();
    expect(strategy.disposed).toBe(1);
  });
});

describe("FormManager scope", () => {
  it("ensureScope is idempotent for the same id and revision", () => {
    const manager = createManager();
    const factory = vi.fn(() => wizardOptions());
    manager.ensureScope("s", factory, "a");
    manager.ensureScope("s", factory, "a");
    expect(factory).toHaveBeenCalledTimes(1);
    manager.ensureScope("s", factory, "b");
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("clearScope clears only the active scope", () => {
    const manager = createManager();
    manager.ensureScope("s", () => wizardOptions());
    manager.clearScope("other");
    expect(manager.hasCompletedBootstrap()).toBe(true);
    manager.clearScope("s");
    expect(manager.hasCompletedBootstrap()).toBe(false);
  });

  it("the same scope bootstraps again after clearAll", () => {
    const manager = createManager();
    const factory = vi.fn(() => wizardOptions());
    manager.ensureScope("s", factory);
    manager.clearAll();
    manager.ensureScope("s", factory);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe("FormManager claims", () => {
  const stepNames = (manager: FormManager<WizardStrategy>) => manager.steps.map((step) => step.name);

  it("a step with a claim exists only when its action is granted", () => {
    const manager = createManager().bootstrap(wizardOptions());
    expect(stepNames(manager)).toEqual(["info", "review"]);
    manager.bootstrap(wizardOptions({ claims: { claim: () => ({ view: true }) } }));
    expect(stepNames(manager)).toEqual(["info", "review"]);
    manager.bootstrap(wizardOptions({ claims: grantAll }));
    expect(stepNames(manager)).toEqual(["info", "details", "review"]);
  });

  it("a denied step is not validated but its value stays in the submitted data", async () => {
    const invalidDetails = { ...validValues, details: { note: "" } };
    const manager = createManager().bootstrap(wizardOptions({ claims: grantNothing, values: invalidDetails }));
    await manager.submit();
    expect(manager.getStrategy().submitted).toEqual([invalidDetails]);
    manager.bootstrap(wizardOptions({ claims: grantAll, values: invalidDetails }));
    await manager.submit();
    expect(manager.getStrategy().submitted).toHaveLength(0);
  });
});

describe("rebuilding the form", () => {
  it("bootstrap and reset regenerate the id; clearAll drops it", () => {
    const manager = createManager().bootstrap(wizardOptions());
    const firstId = manager.getBootstrapId();
    manager.resetFormManager();
    const resetId = manager.getBootstrapId();
    expect(resetId).not.toBe(firstId);
    manager.bootstrap(wizardOptions());
    expect(manager.getBootstrapId()).not.toBe(resetId);
    manager.clearAll();
    expect(manager.getBootstrapId()).toBeNull();
  });

  it("bootstrap drops step listeners, so consumers must remount on the new id", () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    const listener = vi.fn();
    manager.subscribeCurrentStepData(listener);
    manager.bootstrap(wizardOptions({ claims: grantAll }));
    manager.goNext();
    expect(listener).not.toHaveBeenCalled();
  });

  it("step navigation is not blocked by an invalid step", () => {
    const manager = createManager().bootstrap(
      wizardOptions({ claims: grantAll, values: { ...validValues, info: { name: "" } } }),
    );
    expect(manager.steps[0]?.error).toBe(true);
    expect(manager.goNext()?.name).toBe("details");
  });
});

describe("replaceStrategy", () => {
  class ShortStrategy extends WizardStrategy {
    protected override readonly steps = [
      { name: "info", id: "info" },
      { name: "review", id: "review" },
    ] as const;
  }

  it("keeps values, current step, listeners and bootstrap id; reuses claims", () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    manager.goToStep("review");
    manager.form.setValue("info.name", "Grace");
    const bootstrapId = manager.getBootstrapId();
    const listener = vi.fn();
    manager.subscribeCurrentStepData(listener);
    const previous = manager.getStrategy();

    manager.replaceStrategy(new ShortStrategy());

    expect(previous.disposed).toBe(1);
    expect(manager.getBootstrapId()).toBe(bootstrapId);
    expect(manager.getFormValues().info.name).toBe("Grace");
    expect(manager.getCurrentStepInfo().currentStep.name).toBe("review");
    expect(manager.steps.map((step) => step.name)).toEqual(["info", "review"]);
    expect(listener).toHaveBeenCalled();
  });

  it("falls back to the closest previous surviving step when the current one is removed", () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    manager.goToStep("details");
    manager.replaceStrategy(new ShortStrategy());
    expect(manager.getCurrentStepInfo().currentStep.name).toBe("info");
  });

  it("revalidates with the new schema and fills only undefined keys from defaultValues", () => {
    const partialValues = { info: { name: "Ada" }, details: { note: "x" } } as typeof validValues;
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll, values: partialValues }));
    expect(manager.steps.find((step) => step.name === "review")?.error).toBe(true);
    manager.replaceStrategy(new WizardStrategy(), {
      defaultValues: { info: { name: "ignored" }, review: { confirmed: true } },
    });
    expect(manager.getFormValues().info.name).toBe("Ada");
    expect(manager.getFormValues().review.confirmed).toBe(true);
    expect(manager.steps.find((step) => step.name === "review")?.error).toBe(false);
  });

  it("applies new claims when given", () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    manager.replaceStrategy(new WizardStrategy(), { claims: grantNothing });
    expect(manager.steps.map((step) => step.name)).toEqual(["info", "review"]);
  });
});

describe("FormManager navigation", () => {
  it("goNext and goPrev return null at the edges", () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    expect(manager.goPrev()).toBeNull();
    expect(manager.goNext()?.name).toBe("details");
    expect(manager.goNext()?.name).toBe("review");
    expect(manager.isLastStep()).toBe(true);
    expect(manager.goNext()).toBeNull();
    expect(manager.goPrev()?.name).toBe("details");
  });

  it("goToStep reports unknown, same and moved", () => {
    const manager = createManager().bootstrap(wizardOptions({ claims: grantAll }));
    expect(manager.goToStep("details")).toBe(true);
    expect(manager.goToStep("details")).toBeNull();
    expect(manager.goToStep("review")).toBe(true);
    manager.bootstrap(wizardOptions());
    expect(manager.goToStep("details")).toBe(false);
  });

  it("exposes react-hook-form access only through `form`", () => {
    const manager = createManager();
    expect(() => manager.form).toThrow("Form is not valid");
    manager.bootstrap(wizardOptions());
    manager.form.setValue("info.name", "Grace");
    expect(manager.getFormValues().info.name).toBe("Grace");
    expect(manager.form.options.mode).toBe("onChange");
  });

  it("exposes bootstrap id and the typed strategy class", () => {
    const manager = createManager().bootstrap(wizardOptions());
    expect(manager.getBootstrapId()).toEqual(expect.any(String));
    expect(manager.getStrategyClass()).toBe(WizardStrategy);
  });
});

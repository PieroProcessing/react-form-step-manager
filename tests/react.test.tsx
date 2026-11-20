import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";
import {
  FormManager,
  FormManagerProvider,
  StepForm,
  useFormClaims,
  useFormControl,
  useFormManager,
  useFormSteps,
} from "../src";
import { grantAll, wizardOptions, type WizardStrategy } from "./fixtures";

afterEach(cleanup);

const bootstrapped = () => new FormManager<WizardStrategy>().bootstrap(wizardOptions({ claims: grantAll }));

const withManager = (manager: FormManager<WizardStrategy>) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormManagerProvider manager={manager}>{children}</FormManagerProvider>
  );
  return Wrapper;
};

describe("hooks outside a provider", () => {
  it.each<[string, () => unknown]>([
    ["useFormManager", () => useFormManager()],
    ["useFormSteps", () => useFormSteps()],
    ["useFormControl", () => useFormControl()],
    ["useFormClaims", () => useFormClaims("x")],
  ])("%s throws a clear error", (name, hook) => {
    const consoleError = console.error;
    console.error = () => {};
    try {
      expect(() => renderHook(hook)).toThrow(`${name} must be used within a FormManagerProvider`);
    } finally {
      console.error = consoleError;
    }
  });
});

describe("useFormSteps", () => {
  it("follows navigation and keeps the snapshot stable while nothing changes", () => {
    const manager = bootstrapped();
    const { result, rerender } = renderHook(() => useFormSteps(), { wrapper: withManager(manager) });
    expect(result.current.currentStep.name).toBe("info");
    const firstSnapshot = result.current;
    rerender();
    expect(result.current).toBe(firstSnapshot);
    act(() => {
      manager.goNext();
    });
    expect(result.current.currentStep.name).toBe("details");
    expect(result.current.steps.map((step) => step.name)).toEqual(["info", "details", "review"]);
  });
});

describe("useFormClaims", () => {
  it("grants nothing without a form", () => {
    expect(new FormManager<WizardStrategy>().getClaim("wizard.details")).toEqual({});
  });

  it("re-renders when the manager is cleared", () => {
    const manager = bootstrapped();
    const { result } = renderHook(() => useFormClaims<WizardStrategy>("wizard.details"), {
      wrapper: withManager(manager),
    });
    expect(result.current.update).toBe(true);
    act(() => manager.clearAll(false));
    expect(result.current.update).toBeUndefined();
  });
});

describe("isolated instances", () => {
  function CurrentStep({ label }: { label: string }) {
    const { currentStep } = useFormSteps();
    return <span data-testid={label}>{currentStep.name}</span>;
  }

  it("two managers on the same page do not share state", () => {
    const first = bootstrapped();
    const second = bootstrapped();
    render(
      <>
        <FormManagerProvider manager={first}>
          <CurrentStep label="first" />
        </FormManagerProvider>
        <FormManagerProvider manager={second}>
          <CurrentStep label="second" />
        </FormManagerProvider>
      </>,
    );
    act(() => {
      first.goNext();
    });
    expect(screen.getByTestId("first").textContent).toBe("details");
    expect(screen.getByTestId("second").textContent).toBe("info");
  });
});

describe("single page mode", () => {
  it("provides controls from `methods` and no manager", () => {
    const { result } = renderHook(() => {
      const methods = useForm({ defaultValues: { name: "" } });
      return { methods, controls: null as unknown };
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FormManagerProvider methods={result.current.methods}>{children}</FormManagerProvider>
    );
    const controls = renderHook(() => useFormControl(), { wrapper });
    expect(controls.result.current.control).toBe(result.current.methods.control);
    const consoleError = console.error;
    console.error = () => {};
    try {
      expect(() => renderHook(() => useFormManager(), { wrapper })).toThrow("created with `manager`");
    } finally {
      console.error = consoleError;
    }
  });
});

describe("StepForm", () => {
  it("prevents the default submit and calls onSubmit", () => {
    let submitted = 0;
    render(
      <StepForm name="info" onSubmit={() => (submitted += 1)}>
        <button type="submit">go</button>
      </StepForm>,
    );
    screen.getByText("go").click();
    expect(submitted).toBe(1);
  });
});

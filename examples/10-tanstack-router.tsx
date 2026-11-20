// File: src/routes/form.$step.tsx (TanStack Router file-based routing, one route per step).
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormManagerProvider, StepForm, useFormManager, useFormSteps } from "react-form-step-manager";
import { orderFormManager, enterOrderPage, leaveOrderPage } from "./08-scopes";

// The generated routeTree.gen.ts registers "/form/$step" in a real app; here it is not generated.
// @ts-expect-error path literal is only known to the generated route tree
export const Route = createFileRoute("/form/$step")({
  loader: () => enterOrderPage("v1"),
  component: StepRoute,
});

function StepRoute() {
  const { step } = Route.useParams();
  useEffect(() => leaveOrderPage, []);
  return (
    <FormManagerProvider manager={orderFormManager}>
      <StepRouteContent stepName={step} />
    </FormManagerProvider>
  );
}

function StepRouteContent({ stepName }: Readonly<{ stepName: string }>) {
  const manager = useFormManager();
  const navigate = useNavigate();
  const { currentStep } = useFormSteps();

  // URL -> manager
  useEffect(() => {
    manager.goToStep(stepName);
  }, [manager, stepName]);

  // manager -> URL
  useEffect(() => {
    if (currentStep.name !== stepName) {
      void navigate({ to: "/form/$step", params: { step: currentStep.name } });
    }
  }, [currentStep.name, stepName, navigate]);

  return (
    <StepForm name={currentStep.name} id={currentStep.id}>
      <button type="button" onClick={() => manager.goNext()}>Next</button>
    </StepForm>
  );
}

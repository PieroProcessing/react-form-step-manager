import type { ReactElement } from "react";
import { StepForm, useFormSteps } from "react-form-step-manager";
import type { OrderStrategy } from "./order-strategy";

type OrderStep = ReturnType<OrderStrategy["getSteps"]>[number];

const CustomerStep = () => <input name="name" />;
const DetailsStep = () => <textarea name="note" />;
const ReviewStep = () => <input type="checkbox" name="confirmed" />;

function renderStep(stepName: OrderStep["name"]): ReactElement {
  switch (stepName) {
    case "customer":
      return <CustomerStep />;
    case "details":
      return <DetailsStep />;
    case "review":
      return <ReviewStep />;
  }
}

export function CurrentStepForm() {
  const { currentStep } = useFormSteps<OrderStep>();
  return (
    <StepForm name={currentStep.name} id={currentStep.id}>
      {renderStep(currentStep.name)}
    </StepForm>
  );
}

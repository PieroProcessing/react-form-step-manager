import { FormManager, FormManagerProvider, useFormSteps } from "react-form-step-manager";
import { orderDefaults, OrderStrategy } from "./order-strategy";

const createManager = () =>
  new FormManager<OrderStrategy>().bootstrap({ strategy: new OrderStrategy(), defaultValues: orderDefaults });

// Each form owns its manager: navigating one never affects the other.
const billingManager = createManager();
const shippingManager = createManager();

function CurrentStepName() {
  return <span>{useFormSteps().currentStep.name}</span>;
}

export function TwoFormsOnOnePage() {
  return (
    <>
      <FormManagerProvider manager={billingManager}>
        <CurrentStepName />
      </FormManagerProvider>
      <FormManagerProvider manager={shippingManager}>
        <CurrentStepName />
      </FormManagerProvider>
    </>
  );
}

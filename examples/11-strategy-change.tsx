import { useState } from "react";
import { FormManager, FormManagerProvider, useFormSteps } from "react-form-step-manager";
import { orderDefaults, OrderStrategy, type OrderValues } from "./order-strategy";

const manager = new FormManager<OrderStrategy>().bootstrap({
  strategy: new OrderStrategy(),
  defaultValues: orderDefaults,
});

// Scenario A: the input only changes data or metadata. Keep the strategy and the RHF control.
export function applyCustomerType(customerType: string) {
  manager.updateMetadataAndResetFormFields(
    { identity: customerType },
    { values: { customer: { name: "" } } },
  );
}

// Scenario B: the input changes the shape of the form (steps, schema, claims) but typed values and the current step must stay.
export function applyOrderMode(strategy: OrderStrategy) {
  manager.replaceStrategy(strategy, { defaultValues: { review: { confirmed: false } } });
}

// Scenario C: start over with a new strategy (new RHF control, first step).
export function restartWith(defaultValues: OrderValues) {
  manager.bootstrap({ strategy: new OrderStrategy(), defaultValues });
}

function CurrentStepName() {
  return <span>{useFormSteps().currentStep.name}</span>;
}

// `bootstrap` creates a new RHF control and drops the step listeners: remount the provider on a new bootstrap id.
export function RebuildableForm() {
  const [bootstrapId, setBootstrapId] = useState(manager.getBootstrapId());
  return (
    <>
      <button
        type="button"
        onClick={() => {
          restartWith(orderDefaults);
          setBootstrapId(manager.getBootstrapId());
        }}
      >
        Switch mode
      </button>
      <FormManagerProvider key={bootstrapId} manager={manager}>
        <CurrentStepName />
      </FormManagerProvider>
    </>
  );
}

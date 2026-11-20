import { useController } from "react-hook-form";
import {
  FormManager,
  FormManagerProvider,
  StepForm,
  useFormControl,
  useFormManager,
  useFormSteps,
} from "react-form-step-manager";
import { orderDefaults, OrderStrategy } from "./order-strategy";

function NameInput() {
  const { control } = useFormControl();
  const { field, fieldState } = useController({ control, name: "customer.name" });
  return (
    <>
      <input {...field} />
      {fieldState.error && <span>{fieldState.error.message}</span>}
    </>
  );
}

function Wizard() {
  const manager = useFormManager<OrderStrategy>();
  const { steps, currentStep } = useFormSteps();
  return (
    <StepForm name={currentStep.name} id={currentStep.id} onSubmit={() => manager.submit()}>
      <ol>
        {steps.map((step) => (
          <li key={step.name}>{step.name}{step.error ? " (incomplete)" : ""}</li>
        ))}
      </ol>
      {currentStep.name === "customer" && <NameInput />}
      <button type="button" onClick={() => manager.goPrev()}>Back</button>
      {manager.isLastStep() ? (
        <button type="submit">Submit</button>
      ) : (
        <button type="button" onClick={() => manager.goNext()}>Next</button>
      )}
    </StepForm>
  );
}

const manager = new FormManager<OrderStrategy>().bootstrap({
  strategy: new OrderStrategy(),
  defaultValues: orderDefaults,
  claims: { claim: () => ({ view: true, update: true }) },
});

export function BasicWizard() {
  return (
    <FormManagerProvider manager={manager}>
      <Wizard />
    </FormManagerProvider>
  );
}

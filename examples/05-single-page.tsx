import { useController, useForm } from "react-hook-form";
import { FormManagerProvider, StepForm, useFormControl } from "react-form-step-manager";

function EmailInput() {
  const { control } = useFormControl<{ email: string }>();
  const { field } = useController({ control, name: "email" });
  return <input {...field} />;
}

// No steps: pass `methods` from useForm instead of a manager.
export function SinglePageForm() {
  const methods = useForm({ defaultValues: { email: "" } });
  return (
    <FormManagerProvider methods={methods}>
      <StepForm name="contact" onSubmit={methods.handleSubmit((values) => console.log(values))}>
        <EmailInput />
        <button type="submit">Save</button>
      </StepForm>
    </FormManagerProvider>
  );
}

import type { CSSProperties, ReactNode } from "react";

export interface StepFormProps {
  name: string;
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
  onSubmit?: () => void;
}

export function StepForm({ name, id, children, style, onSubmit }: Readonly<StepFormProps>) {
  return (
    <form
      id={id}
      name={name}
      data-testid={`${name}-form`}
      style={style}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
    </form>
  );
}

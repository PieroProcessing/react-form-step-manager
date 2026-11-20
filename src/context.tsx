import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  useForm,
  type Control,
  type FieldValues,
  type UseFormReturn,
  type UseFormSetError,
  type UseFormSetValue,
  type UseFormTrigger,
} from "react-hook-form";
import type { FormManager } from "./form-manager";
import type { ActionOf, ClaimOf, FormManagerSteps, Step } from "./models";
import type { AnyStrategy } from "./strategy";
import { isSameCurrentStepData } from "./utils";

export interface FormControlContext<TValues extends FieldValues = FieldValues> {
  setValue: UseFormSetValue<TValues>;
  setError: UseFormSetError<TValues>;
  trigger: UseFormTrigger<TValues>;
  control: Control<TValues, unknown, TValues>;
}

interface FormManagerContextValue {
  manager: FormManager<any> | null;
  controls: FormControlContext<any>;
}

const FormManagerContext = createContext<FormManagerContextValue | null>(null);

type ControlSource = Pick<UseFormReturn<any>, "control" | "setValue" | "setError" | "trigger">;

function ContextBridge({
  manager,
  source,
  children,
}: Readonly<{ manager: FormManager<any> | null; source: ControlSource; children: ReactNode }>) {
  const { control, setValue, setError, trigger } = source;
  const value = useMemo<FormManagerContextValue>(
    () => ({ manager, controls: { control, setValue, setError, trigger } }),
    [manager, control, setValue, setError, trigger],
  );
  return <FormManagerContext.Provider value={value}>{children}</FormManagerContext.Provider>;
}

function ManagerProvider({
  manager,
  children,
}: Readonly<{ manager: FormManager<any>; children: ReactNode }>) {
  const methods = useForm({ formControl: manager.form.control, ...manager.form.options });
  return (
    <ContextBridge manager={manager} source={methods}>
      {children}
    </ContextBridge>
  );
}

export type FormManagerProviderProps =
  | Readonly<{ manager: FormManager<any>; methods?: never; children: ReactNode }>
  | Readonly<{ methods: UseFormReturn<any>; manager?: never; children: ReactNode }>;

/**
 * Provides a form to the tree. `manager` (multi-step, must be bootstrapped) or `methods` (single page, from `useForm`).
 */
export function FormManagerProvider(props: FormManagerProviderProps) {
  if (props.manager) {
    return <ManagerProvider manager={props.manager}>{props.children}</ManagerProvider>;
  }
  return (
    <ContextBridge manager={null} source={props.methods}>
      {props.children}
    </ContextBridge>
  );
}

function useFormManagerContext(hookName: string): FormManagerContextValue {
  const context = useContext(FormManagerContext);
  if (!context) throw new Error(`${hookName} must be used within a FormManagerProvider`);
  return context;
}

function useRequiredManager<TStrategy extends AnyStrategy>(hookName: string): FormManager<TStrategy> {
  const { manager } = useFormManagerContext(hookName);
  if (!manager) {
    throw new Error(`${hookName} needs a FormManagerProvider created with \`manager\`, not \`methods\``);
  }
  return manager as FormManager<TStrategy>;
}

/** The manager of the closest provider. Throws outside a provider or in single page mode. */
export function useFormManager<TStrategy extends AnyStrategy = AnyStrategy>(): FormManager<TStrategy> {
  return useRequiredManager<TStrategy>("useFormManager");
}

export function useFormControl<TValues extends FieldValues = FieldValues>(): FormControlContext<TValues> {
  return useFormManagerContext("useFormControl").controls as FormControlContext<TValues>;
}

/** Steps and current step of the manager, with a stable snapshot while nothing relevant changes. */
export function useFormSteps<TStep extends Step<any, any, any> = Step>(): FormManagerSteps<TStep> {
  const manager = useRequiredManager<AnyStrategy>("useFormSteps");
  const snapshotRef = useRef<FormManagerSteps<TStep> | null>(null);
  const getSnapshot = () => {
    const nextSnapshot = manager.getCurrentStepInfo<TStep>();
    const currentSnapshot = snapshotRef.current;
    if (currentSnapshot && isSameCurrentStepData(currentSnapshot, nextSnapshot)) {
      return currentSnapshot;
    }
    snapshotRef.current = nextSnapshot;
    return nextSnapshot;
  };
  return useSyncExternalStore(manager.subscribeCurrentStepData, getSnapshot, getSnapshot);
}

/** Actions granted on a claim, as decided at bootstrap. Without a bootstrapped form nothing is granted. */
export function useFormClaims<TStrategy extends AnyStrategy = AnyStrategy>(
  id: ClaimOf<TStrategy>,
): Partial<Record<ActionOf<TStrategy>, boolean>> {
  const manager = useRequiredManager<TStrategy>("useFormClaims");
  return useSyncExternalStore(
    manager.subscribeClaims,
    () => manager.getClaim(id),
    () => manager.getClaim(id),
  );
}

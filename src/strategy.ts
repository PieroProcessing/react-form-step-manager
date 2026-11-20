import type { z, ZodObject } from "zod";
import type { FormManagerMetadata, Step } from "./models";

export abstract class AbstractStrategy<
  TSchema extends ZodObject = ZodObject,
  TSubmitData = z.infer<TSchema>,
  TMetadata extends object = FormManagerMetadata,
  TSubmitResult = unknown,
  TClaim extends string = string,
  TAction extends string = string,
> {
  protected abstract steps: readonly Step<TSchema, TClaim, TAction>[];
  protected abstract schema: TSchema;
  protected abstract metadata?: TMetadata;
  /** Claims used by the form besides the ones of its steps (e.g. sections inside a step). */
  protected claims: readonly TClaim[] = [];

  /** `report` may be called many times (e.g. pending, then the final status). */
  abstract submit(
    data: TSubmitData,
    report: (result: TSubmitResult) => void,
  ): void | Promise<void>;

  /** Hook: the form is reset (`resetFormManager`). Release in-flight work here. */
  onReset(): void {}

  /** Hook: the strategy is retired (`clearAll`, `clearScope`, a new `bootstrap`). */
  onDispose(): void {}

  getSteps(): readonly Step<TSchema, TClaim, TAction>[] {
    return this.steps;
  }

  /** All declared steps, before claims: needed to know which schemas to neutralize. */
  getDeclaredSteps(): readonly Step<TSchema, TClaim, TAction>[] {
    return this.steps;
  }

  /** Form claims: the declared ones plus the ones of the steps. */
  getClaims(): TClaim[] {
    const ids = new Set<TClaim>(this.claims);
    for (const step of this.steps) if (step.claim) ids.add(step.claim);
    return [...ids];
  }

  getFormSchema(): TSchema {
    return this.schema;
  }

  /** The schema root must be a `ZodObject`: each step maps to one of its keys. */
  getStepSchema(step: Step<TSchema, TClaim, TAction>): z.ZodType {
    return this.schema.shape[step.name as string] as z.ZodType;
  }

  getMetadata<T>(): T {
    return this.metadata as T;
  }

  updateMetadata(metadata: Partial<TMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata } as TMetadata;
  }
}

export type AnyStrategy = AbstractStrategy<any, any, any, any, any, any>;

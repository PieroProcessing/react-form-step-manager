import { z } from "zod";
import { AbstractStrategy, type Step } from "react-form-step-manager";

export const orderSchema = z.object({
  customer: z.object({ name: z.string().min(1) }),
  details: z.object({ note: z.string() }),
  review: z.object({ confirmed: z.boolean() }),
});

export type OrderValues = z.infer<typeof orderSchema>;
export type OrderClaim = "orders.details";
export type OrderAction = "view" | "update";
export type OrderStatus = { status: "pending" | "success" };

export const orderDefaults: OrderValues = {
  customer: { name: "" },
  details: { note: "" },
  review: { confirmed: false },
};

export class OrderStrategy extends AbstractStrategy<
  typeof orderSchema,
  OrderValues,
  { identity: string },
  OrderStatus,
  OrderClaim,
  OrderAction
> {
  protected readonly steps: readonly Step<typeof orderSchema, OrderClaim, OrderAction>[] = [
    { name: "customer", id: "order.customer" },
    { name: "details", id: "order.details", claim: "orders.details", action: "update" },
    { name: "review", id: "order.review" },
  ];
  protected readonly schema = orderSchema;
  protected readonly metadata = { identity: "order" };

  async submit(_data: OrderValues, report: (result: OrderStatus) => void) {
    report({ status: "pending" });
    await Promise.resolve();
    report({ status: "success" });
  }
}

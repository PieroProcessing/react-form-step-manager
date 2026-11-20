import { FormManager, type StrategyClass } from "react-form-step-manager";
import { orderDefaults, OrderStrategy, type OrderValues } from "./order-strategy";

type OrderStatics = { createPayload(values: OrderValues): { customerName: string } };

class PayloadOrderStrategy extends OrderStrategy {
  static createPayload(values: OrderValues) {
    return { customerName: values.customer.name };
  }
}

export function buildPayload() {
  const manager = new FormManager<PayloadOrderStrategy>().bootstrap({
    strategy: new PayloadOrderStrategy(),
    defaultValues: orderDefaults,
  });
  const strategyClass: StrategyClass<PayloadOrderStrategy, OrderStatics> =
    manager.getStrategyClass<OrderStatics>();
  return strategyClass.createPayload(manager.getFormValues());
}

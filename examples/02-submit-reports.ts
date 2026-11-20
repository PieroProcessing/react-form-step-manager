import { FormManager } from "react-form-step-manager";
import { orderDefaults, OrderStrategy, type OrderStatus } from "./order-strategy";

// The strategy calls `report` twice: pending first, then success. `onResult` receives both.
export async function submitWithReports() {
  const manager = new FormManager<OrderStrategy>().bootstrap({
    strategy: new OrderStrategy(),
    defaultValues: { ...orderDefaults, customer: { name: "Ada" } },
  });
  const statuses: OrderStatus["status"][] = [];
  await manager.submit((result) => statuses.push(result.status));
  return statuses; // ["pending", "success"]
}

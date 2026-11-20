import { FormManager } from "react-form-step-manager";
import { orderDefaults, OrderStrategy } from "./order-strategy";

// No React needed: bootstrap a manager and drive it directly (e.g. inside a Vitest test).
export async function exerciseStrategyWithoutReact() {
  const manager = new FormManager<OrderStrategy>().bootstrap({
    strategy: new OrderStrategy(),
    defaultValues: { ...orderDefaults, customer: { name: "Ada" } },
  });
  const firstStep = manager.goNext(); // "review": details is hidden without claims
  const reachedEdge = manager.goNext(); // null at the last step
  const results: unknown[] = [];
  await manager.submit((result) => results.push(result));
  return { firstStep, reachedEdge, results };
}

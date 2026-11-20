import { FormManager } from "react-form-step-manager";
import { orderDefaults, OrderStrategy } from "./order-strategy";

export const orderFormManager = new FormManager<OrderStrategy>();

const SCOPE_ID = "order-page";

// Call on route enter (loader): safe to repeat, rebuilds only when the revision changes.
export function enterOrderPage(permissionsRevision: string) {
  orderFormManager.ensureScope(
    SCOPE_ID,
    () => ({ strategy: new OrderStrategy(), defaultValues: orderDefaults }),
    permissionsRevision,
  );
}

// Call on route leave: does nothing if another page already took over the manager.
export function leaveOrderPage() {
  orderFormManager.clearScope(SCOPE_ID);
}

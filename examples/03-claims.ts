import { FormManager, type ClaimsResolver } from "react-form-step-manager";
import { orderDefaults, OrderStrategy, type OrderAction, type OrderClaim } from "./order-strategy";

const viewerClaims: ClaimsResolver<OrderClaim, OrderAction> = {
  claim: () => ({ view: true }),
};
const editorClaims: ClaimsResolver<OrderClaim, OrderAction> = {
  claim: () => ({ view: true, update: true }),
};

export function stepNamesFor(claims: ClaimsResolver<OrderClaim, OrderAction>) {
  const manager = new FormManager<OrderStrategy>().bootstrap({
    strategy: new OrderStrategy(),
    defaultValues: orderDefaults,
    claims,
  });
  return manager.steps.map((step) => step.name);
}

export const viewerSteps = stepNamesFor(viewerClaims); // ["customer", "review"]
export const editorSteps = stepNamesFor(editorClaims); // ["customer", "details", "review"]

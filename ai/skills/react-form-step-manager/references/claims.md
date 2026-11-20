# Claims

A claim is an opaque id (e.g. `"orders.details"`); an action is a verb (`"view"`, `"update"`, ...). The library has no auth dependency: you inject decisions.

```ts
const claims: ClaimsResolver<"orders.details", "view" | "update"> = {
  claim: (id) => permissions.for(id), // Partial<Record<"view" | "update", boolean>>
};
manager.bootstrap({ strategy, defaultValues, claims });
```

- No `claims` option: no claim is granted, every step with a `claim` is hidden.
- `Step.action` defaults to `view`.
- Denied step: absent from `manager.steps`; its schema becomes `z.any()` in the resolver, so its default values are neither validated nor dropped at submit.
- Decisions are fixed at bootstrap. To change them, bootstrap again (`ensureScope(id, factory, revision)` with a new `revision`).
- In React: `const { update } = useFormClaims<MyStrategy>("orders.details")`. Unknown claim or no form: `{}`.

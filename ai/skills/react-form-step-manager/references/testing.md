# Testing

Run in band: `npx vitest run --no-file-parallelism --maxWorkers=1`.

## Without React

```ts
const manager = new FormManager<MyStrategy>().bootstrap({ strategy: new MyStrategy(), defaultValues, claims });
expect(manager.steps.map((step) => step.name)).toEqual(["info", "review"]);
const results: unknown[] = [];
await manager.submit((result) => results.push(result));
expect(manager.getStrategy().submitted).toEqual([defaultValues]);
```

- Each test creates its own manager: no shared state to reset.
- An invalid form never reaches `strategy.submit`.
- `goNext()` / `goPrev()` return `null` at the edges.

## With hooks

```tsx
const wrapper = ({ children }) => <FormManagerProvider manager={manager}>{children}</FormManagerProvider>;
const { result } = renderHook(() => useFormSteps(), { wrapper });
act(() => { manager.goNext(); });
```

Bootstrap before rendering the provider. Wrap manager mutations in `act`.

## Types

`expectTypeOf<NonNullable<BootstrapOptions<MyStrategy>["claims"]>>().toEqualTypeOf<ClaimsResolver<MyClaim, MyAction>>()`.

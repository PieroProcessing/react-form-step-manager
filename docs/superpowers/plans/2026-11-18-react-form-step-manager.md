# ReactFormStepManager Implementation Plan

Spec: `docs/superpowers/specs/2026-11-18-react-form-step-manager-design.md`. Source reference (read-only): `AE.Orbiter/frontend/src/core/form-manager`. Run tests in band: `npx vitest run --no-file-parallelism --maxWorkers=1`.

## Task 1 — Scaffold
- `package.json` (name `react-form-step-manager`, `bin`, `files: [dist, ai, bin, NOTICE, llms.txt]`, peer deps per spec), `tsconfig.json` (strict), `tsup.config.ts`, `vitest.config.ts` (jsdom), `.gitignore`, `git init`.
- `LICENSE` (Apache-2.0), `NOTICE` (PieroProcessing).

## Task 2 — Core types and strategy (TDD)
- `src/models.ts`: `Step<TSchema, TClaim, TAction>`, `ClaimsResolver`, `BootstrapOptions`, listeners, narrow `FormStatus`.
- `src/strategy.ts`: `AbstractStrategy` with `claims` generics, `getDeclaredSteps`, `getClaims()`, hooks; `StrategyClass<TStrategy, TStatics>`.

## Task 3 — FormManager (TDD)
- Port `form-manager.ts` as a public class, no singleton; rename feature→claims; fix bounds, `getBootstrapId`, UUID fallback; add `getStrategyClass()`.
- Port tests: submit, scope, access→claims.

## Task 4 — React layer (TDD)
- `FormManagerProvider` (`manager`, optional `methods`), `useFormManager`, `useFormSteps`, `useFormClaims`, `useFormControl`, `StepForm`.
- Tests: two isolated instances, outside-provider errors, snapshot stability.

## Task 5 — Public exports and build
- `src/index.ts`; `npm run build`; verify d.ts with a type test.

## Task 6 — CLI
- `bin/install-skill.mjs`: copies `ai/skills/react-form-step-manager` into `./.agents/skills` (flags `--target claude|agents|<path>`, `--force`). Test with a temp dir.

## Task 7 — AI docs
- `ai/skills/react-form-step-manager/SKILL.md` + `references/{api,strategy,claims,testing,recipes}.md`, `ai/AGENTS.md`, `llms.txt`.

## Task 8 — README and examples
- README (English): install, quick start, API, Attribution, the 10 scenarios (incl. switch/case and TanStack Router file-based routes).
- `examples/` files for each scenario, type-checked by `tsc -p examples`.

## Task 9 — Verification
- `npm run typecheck`, `npm test` (in band), `npm run build`, `npm pack --dry-run` to confirm `ai/` and `bin/` are included, run the CLI from the packed tarball.
- Then create the GitHub repo (`gh repo create` if available, otherwise provide the commands).

## Approval gates
Per workflow preference, each task is proposed and approved before implementing.

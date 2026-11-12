# Scanner & Engine Capability Gap Matrix · ArkCompat (Stage 2 / B1)

**Updated:** 2026-11-12. Maps current implemented capabilities (`packages/core`, `packages/knowledge`, `packages/evaluation`, `apps/*`) against the candidate targets in [TARGET-MATRIX](TARGET-MATRIX.md) and [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md).

## 1. Dependency & Workspace Resolution Matrix

| Ecosystem / Format | Implemented Today | Verified Evidence | Remaining Gap vs. 2026-12-23 Acceptance |
|---|---|---|---|
| **npm (`package-lock.json` v2/v3, `npm-shrinkwrap.json`)** | Direct & transitive graph projection, hoisted/nested resolution, local links, semver `mismatch`, workspaces (`*`, `**`, `?`, embedded `*`, `[ab]`/`[!a]`, bounded braces & sequences) | `tests/npm-lock.test.ts`, `tests/npm-workspaces.test.ts`, `tests/registry-range.test.ts` | npm v1 lockfiles (`lockfileVersion: 1`), `workspace:*` / `alias` edge nuances, extglobs/negated workspace exclusions (`!pkg`), peer conflict resolution |
| **pnpm (`pnpm-lock.yaml` v9, `pnpm-workspace.yaml`)** | Importer/snapshot graph, peer contexts, alias identity, module-local projection, `*`/`**`/`?`/`[ab]`/`[!a]` & simple sequence workspaces, semver `mismatch` | `tests/pnpm-lock.test.ts`, `tests/pnpm-workspaces.test.ts` | Older pnpm lockfiles (`v5`/`v6`), catalog (`catalog:` / `catalogs:`) specifiers, negated workspace patterns (`!packages/excluded`), `overrides` provenance |
| **Yarn (`yarn.lock` Classic v1 & Berry v8)** | Classic exact/grouped selectors, Berry v8 registry descriptors, workspace discovery (`*`/`**`/`?`/`[ab]`/`[!a]` & simple sequences), semver `mismatch` | `tests/yarn-lock.test.ts`, `tests/yarn-berry.test.ts`, `tests/yarn-workspaces.test.ts` | Yarn Berry v10 lockfiles (`__metadata.version > 8`), Classic workspace hoisting (`nohoist`), Yarn `patch:` / `portal:` / `workspace:` protocol resolution |
| **OHPM (`oh-package.json5`, `oh-package-lock.json5` v3, `build-profile.json5`)** | Root & configured-module declarations, adjacent & unified v3 lock graphs, local HAR path redaction, semver `mismatch` | `tests/ohpm-manifest.test.ts`, `tests/ohpm-lock.test.ts`, `tests/ohpm-modules.test.ts` | `dynamicDependencies` section, nested OHPM module overrides, non-v3 lockfile versions, `parameterFile` version indirection |

## 2. Source / AST / API Analysis Matrix

| Capability | Implemented Today | Verified Evidence | Remaining Gap vs. 2026-12-23 Acceptance |
|---|---|---|---|
| **JS/TS Module References** | ESM `import`/`export`, `import =`, `import type`, literal `import()`, `require()`, `node:*` and bare specifiers | `tests/scan.test.ts`, `tests/source-api.test.ts` | Non-literal/computed dynamic imports (`import(expr)`), `require.resolve()`, `package.json` `exports`/`imports` subpath resolution |
| **Imported Symbol & API Access** | Direct calls, constructors, optional chaining, static brackets, awaited literal imports, bounded `const` aliases (depth 32, cycle guard), `const` object destructures | `tests/awaited-import.test.ts`, `tests/const-alias.test.ts`, `tests/source-api.test.ts` | **Global / host APIs without explicit imports** (`window`, `document`, `navigator`, `fetch`, `process`, `Buffer`, `localStorage`, `XMLHttpRequest`, `WebSocket`, `crypto.subtle`); **CommonJS `module.exports` / `exports` assignments**; cross-file/barrel re-export tracing; `let` / class-field alias flows |
| **ArkTS (`.ets`) Source Analysis** | `struct` offset-preserving rewrite, direct imported call/constructor attribution, lexical shadow detection, partial syntax recovery | `tests/source-api.test.ts` | ArkUI DSL block analysis, `@ohos.*` / `@kit.*` SDK symbol version checks vs. HarmonyOS 6.0.0+ (API 20+) SDK API levels |

## 3. Rules, Knowledge & Evaluation Matrix

| Capability | Implemented Today | Verified Evidence | Remaining Gap vs. 2026-12-23 Acceptance |
|---|---|---|---|
| **Target-Aware API Rules (`api-rules`)** | Exact `(os, release, runtime, apiLevel, module, path, kind)` matcher emitting `potential-risk` or typed `unknown`; 1 MiB / 1,000 rule schema | `tests/api-rules.test.ts` | **No curated HarmonyOS 6.0.0+ / API 20+ ruleset shipped yet**; exact-release equality lacks semver/min-API-level range matching (`>= 6.0.0` / `apiLevel >= 20`); rule priority/conflict resolution (`verified-incompatible`, `conditional`, `potential-risk`); unified integration in default/configured `scan` flow |
| **Knowledge Base (`@arkcompat/knowledge`)** | Schema `0.1.0`, offline import/query/canonical export, expiry/review/scope/ambiguity exclusions | `tests/knowledge-contract.test.ts`, `tests/knowledge-semantics.test.ts` | **Zero curated real-world records active**; needs sourced, licensed dataset covering `ohpm-release`, `gitcode-port`, `pure-js`, `missing-port`, `unknown`; needs unified CLI/Core pipeline connecting scan findings to reviewed replacements & 5-way port classification (`B5`/`B6`) |
| **Evaluation Harness (`@arkcompat/evaluation`)** | Generic binary evaluator + `predictRootDependencies` (`root-declaration-presence`) | `tests/evaluation.test.ts`, `tests/dependency-predictions.test.ts` | **Missing label-blind prediction adapters** for: (1) full dependency graphs (direct + transitive + version), (2) incompatible API usage, (3) replacement recommendations (100% + coverage), and (4) 5-way missing-port identification (`B9`); needs holdout provenance/isolation manifest (`B8`) |

## 4. Priority Engineering Sequence (for `B2`–`B9`)

1. **Global & host API + `node:` protocol detection (`B2`)**: Needed immediately for HarmonyOS 6.0.0+ incompatible API recall (`>= 80%`) because browser DOM (`window`/`document`/`localStorage`/`fetch`) and Node globals (`process`/`Buffer`) are major incompatibility sources even without ES `import`.
2. **Version-range API ruleset & unified scan-to-classification pipeline (`B3`, `B5`)**: Support HarmonyOS `>= 6.0.0` / `apiLevel >= 20` rule matching, conflict precedence, and sourced public HarmonyOS 6.0.0+ API incompatibility rules.
3. **5-way missing-port classifier & verified public-metadata knowledge pipeline (`B4`, `B6`, `B7`)**: Enforce strict provenance, review gating, and zero name-absence-to-missing fallacy.
4. **Four label-blind evaluation adapters (`B8`, `B9`)**: Enable independent blind holdout scoring as soon as adjudicator labels (`A5`) are supplied.

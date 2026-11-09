# Imported API call inventory · M1 / Issue #3

The scanner now records call/constructor sites reached through imported bindings, using the pinned TypeScript 5.9.3 Compiler API. The [Compiler API guide](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) describes the program/checker model. Analysis remains isolated to supplied source text: no project tsconfig, external declarations, registry, package lifecycle or source execution is loaded.

## Reproduce

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0
```

The authored fixture yields six module references and four API sites. An imported name shadowed by a local callback is excluded. Input is synthetic; never execute or install the fixture.

## Experimental report 0.7.0

The report requires `apiUsages` alongside the existing dependency graph and references. Each usage includes sanitized module specifier, static access path, call/construct kind, optional-chain flag and relative one-based location. `inventory.api-usage` findings carry the same target and unknown status as the inventory; no rule or SDK support is inferred. Consumers of 0.1–0.4 must update the strict schema/types.

Access paths preserve binding semantics: `['default', 'get']` for `import client ...; client.get()`, `['*', 'readFile']` for namespace or CommonJS-object access, and `['readFile']` for a named import/destructure. These are observed syntax through a module binding, not proof that a real export exists, runs or retains its original value. Arguments and source snippets are not serialized.

Supported source inventory:

- Named/default/namespace ESM value bindings, including renamed imports; type-only bindings never become runtime API sites.
- Unshadowed CommonJS `require` references, literal calls, const namespace bindings and simple const object destructuring. TypeScript's synthesized JS require symbol is distinguished from real declarations; local parameters/functions named require are excluded. Loader identity assumes ordinary CommonJS semantics and is not runtime-verified.
- TypeScript external import-equals and type import references. Nonliteral require/import arguments remain null references without serializing expressions.
- Const namespace/simple object destructuring from literal `await import(...)`, plus direct member calls on awaited literal imports. The existing namespace/named/default access paths are retained. Only an actual AST await expression is recognized; an ordinary script function named `await` is not a loader. No import promise is executed or resolved.
- Simple const identifier aliases of imported values and their static members, including chained aliases. Lexical symbols resolve the initializer regardless of declaration traversal order; locations refer to the eventual call/constructor site. Optional calls, TS wrappers and static bracket access reuse the same paths. This observes potential static origin, not execution order, initialization or object immutability.
- Calls, constructors, static dot-member paths, optional calls and parenthesis/type-assertion wrappers. Bracket members with string literals or templates without interpolation normalize to the same path as dot members, including nested/optional access. URL/path-like keys use the existing public-specifier redaction policy. Lexical symbols distinguish imported aliases from same-spelled locals; no external module resolution is needed.

The additional authored fixture `fixtures/developer/static-members` yields **two references and two API sites**, one through `node:fs` and one through a default client import. A dynamic-key call produces a `computed-module-member-not-analyzed` limitation; a shadowed local object is excluded. Reproduce with `pnpm --silent scan fixtures/developer/static-members --runtime arkts --release 6.0.0`. Calls are never executed. The fixture is a regression sample, not an independent accuracy denominator.

The authored fixture `fixtures/developer/awaited-import` yields **three dynamic-import references (one unresolved) and two API sites**, through a const namespace and a default destructure. Its nonliteral import remains null and retains `dynamic-import-bindings-not-analyzed`. Reproduce with `pnpm --silent scan fixtures/developer/awaited-import --runtime arkts --release 6.0.0`. The async function, imported APIs and constructor are never executed by the scanner. These are synthetic inventory counts, not runtime verification or independent accuracy.

A simple object destructure from an existing imported value is also traced. For example, `const { readFile: read } = fs; read()` preserves the same path as `const read = fs.readFile; read()`. Destructuring a known member preserves its prefix: `const { send } = client.transport` records `["default", "transport", "send"]` for a default import. Direct destructures from literal loaders keep their existing named paths. The same 32-alias bound and lexical shadow checks apply. Reverting this increment restores the earlier limitation without changing the report contract.

## Explicit limits

Mutable require/awaited-import bindings and aliases, destructuring defaults/rest/nesting/arrays and computed destructuring keys, non-awaited import promises/callbacks, dynamic module expressions and computed members with nonliteral keys are not attributed to an original API. The report exposes applicable limitations. Even a `const` identifier key is not evaluated: identifiers, interpolated templates, numeric keys and concatenation remain unknown. Returned-value methods, module mutation, global browser/Node APIs, CommonJS exports/resolution, re-export/dataflow across files and dynamic runtime state remain unverified/unimplemented. For example, `fs.open().then()` inventories `fs.open`, not the API of its returned object.

The authored fixture `fixtures/developer/const-alias` yields **one module reference and one API site** through a two-step immutable alias. A shadowed callback and a mutable copy are excluded; the mutable copy retains `module-alias-dataflow-not-analyzed`. Reproduce with `pnpm --silent scan fixtures/developer/const-alias --runtime arkts --release 6.0.0`. No fixture execution or independent accuracy claim is implied.

Alias resolution follows at most **32 copied const declarations per access** and does not cache/collapse chains. Cycles produce `module-alias-cycle-not-analyzed`; excessive depth produces `module-alias-depth-limit`; both omit unresolved API sites and serialize no alias expression. Unsupported aliases retain the existing dataflow limitation where their initializer has a known module origin. This is bounded syntax tracing, not control-flow or mutation analysis. A forward-declared alias may be inventoried in a function even though initialization and call ordering remain unverified. Reverting the const-alias PR restores the earlier limitation without a schema migration.

Static-member support retains experimental schema 0.5.0 and the unknown-only finding contract. It does not verify exports or target compatibility. Reverting the static-member PR restores the earlier explicit limitation for all bracket accesses, without a report-schema migration.

Awaited-import support also keeps schema 0.5.0 and unknown findings. Successfully consumed literal imports retain their module references and use the existing binding/member limitations where applicable; unresolved/mutable/non-awaited imports keep the dynamic-import limitation. There is no cross-file, promise/dataflow or import-option runtime verification. Top-level await parsing follows the supplied file syntax; no project module mode is inferred. Revert this scoped PR to restore the earlier limitation for awaited bindings; no schema migration is required.

Source programs receive syntax diagnostics only. This does not typecheck the scanned project or validate module exports. ETS remains unsupported. Call sites are potential source locations, not a count of executed calls or incompatible APIs. Binding existence before initialization and mutation/lifecycle semantics are not verified. Source/privacy/read-size policies remain those of [the scanner](SCANNER-SLICE.md).

## Delivery and mirror policy

GitHub PR and post-merge main checks verify the implementation. AtomGit receives the same tested main commit via non-forced HTTPS push; SHA equality is the mirror proof. SSH transport availability is independent from repository access. A successful dry-run or local test alone does not establish synchronization or independent acceptance.

Issue #3 remains open for full workspace/format coverage, API/dataflow completeness, deterministic target-aware compatibility rules and independent evaluation. No acceptance metric or release is claimed by this inventory increment.

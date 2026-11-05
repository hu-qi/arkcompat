# Imported API call inventory · M1 / Issue #3

The scanner now records call/constructor sites reached through imported bindings, using the pinned TypeScript 5.9.3 Compiler API. The [Compiler API guide](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) describes the program/checker model. Analysis remains isolated to supplied source text: no project tsconfig, external declarations, registry, package lifecycle or source execution is loaded.

## Reproduce

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0
```

The authored fixture yields six module references and four API sites. An imported name shadowed by a local callback is excluded. Input is synthetic; never execute or install the fixture.

## Experimental report 0.5.0

The report requires `apiUsages` alongside the existing dependency graph and references. Each usage includes sanitized module specifier, static access path, call/construct kind, optional-chain flag and relative one-based location. `inventory.api-usage` findings carry the same target and unknown status as the inventory; no rule or SDK support is inferred. Consumers of 0.1–0.4 must update the strict schema/types.

Access paths preserve binding semantics: `['default', 'get']` for `import client ...; client.get()`, `['*', 'readFile']` for namespace or CommonJS-object access, and `['readFile']` for a named import/destructure. These are observed syntax through a module binding, not proof that a real export exists, runs or retains its original value. Arguments and source snippets are not serialized.

Supported source inventory:

- Named/default/namespace ESM value bindings, including renamed imports; type-only bindings never become runtime API sites.
- Unshadowed CommonJS `require` references, literal calls, const namespace bindings and simple const object destructuring. TypeScript's synthesized JS require symbol is distinguished from real declarations; local parameters/functions named require are excluded. Loader identity assumes ordinary CommonJS semantics and is not runtime-verified.
- TypeScript external import-equals and type import references. Nonliteral require/import arguments remain null references without serializing expressions.
- Calls, constructors, static dot-member paths, optional calls and parenthesis/type-assertion wrappers. Lexical symbols distinguish imported aliases from same-spelled locals; no external module resolution is needed.

## Explicit limits

Mutable require bindings, destructuring defaults/rest/nesting, copied member aliases, dynamic import bindings and computed members are not attributed to an original API. The report exposes applicable limitations. Returned-value methods, module mutation, global browser/Node APIs, CommonJS exports/resolution, re-export/dataflow across files and dynamic runtime state remain unverified/unimplemented. For example, `fs.open().then()` inventories `fs.open`, not the API of its returned object.

Source programs receive syntax diagnostics only. This does not typecheck the scanned project or validate module exports. ETS remains unsupported. Call sites are potential source locations, not a count of executed calls or incompatible APIs. Binding existence before initialization and mutation/lifecycle semantics are not verified. Source/privacy/read-size policies remain those of [the scanner](SCANNER-SLICE.md).

## Delivery and mirror policy

GitHub PR and post-merge main checks verify the implementation. AtomGit receives the same tested main commit via non-forced HTTPS push; SHA equality is the mirror proof. SSH transport availability is independent from repository access. A successful dry-run or local test alone does not establish synchronization or independent acceptance.

Issue #3 remains open for full workspace/format coverage, API/dataflow completeness, deterministic target-aware compatibility rules and independent evaluation. No acceptance metric or release is claimed by this inventory increment.

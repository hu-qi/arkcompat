# Offline inventory slice · Issue #3

Experimental implementation for M0's JSON spike and the first part of M1. The repository is MIT licensed; workspace packages remain private and unpublished pending release decisions. No legacy implementation or mapping data has been imported.

## Reproduce

Use Node 22.13+ within the 22 line, or Node 24, and pnpm 10.34.9 (`packageManager` is pinned). The GitHub Actions matrix checks Linux on Node 22/24 and macOS on Node 24.

```bash
corepack enable
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/inventory --runtime arkts --release 6.0.0
# Keep stdout as JSON for downstream consumers:
node apps/cli/dist/index.js scan fixtures/developer/inventory --runtime arkts --release 6.0.0 > report.json
```

`pnpm check` builds the packages and runs formatting, ESLint, production/test type checks, regression tests, JSON Schema validation, CLI/core parity and documentation checks. Build before invoking the CLI directly. `--api-level` accepts a positive integer and is optional; no OS-to-API-level mapping is inferred. A supplied release is scan context, not proof that the target SDK was tested.

## Implemented boundary

- Root `package.json`: retain declarations in dependencies/devDependencies/optionalDependencies/peerDependencies. Alias/workspace specifiers stay declarations. npm/pnpm/Yarn graph metadata is separate from declarations and is not proof of actual installation. Optional entries can also appear in dependencies and remain section-specific records.
- JS/JSX/TS/TSX/MJS/MTS/CJS/CTS/ETS: Compiler API extracts import/export/dynamic import, unshadowed require, import-equals and type import references. Symbol-aware imported call/constructor sites are inventoried; see [source API scope](SOURCE-API-INVENTORY.md). `.ets` adds same-length `struct` normalization, a conservative imported-name fallback and explicit partial-syntax limitations for ArkUI constructs. A nonliteral dynamic import has a null specifier. Locations are relative paths and one-based line/column positions. Source text and comments are not copied into reports.
- Report schema 0.11.0: deterministic inventory IDs, explicit target, evidence, generalized npm/pnpm/Yarn/OHPM module provenance and `unknown` status; rules/knowledge snapshots are `none`. No timestamps or absolute project root in successful reports. IDs distinguish inventory sites; they are not guaranteed stable across edits or future schema versions.
- Scanner reads local files only and never installs dependencies or executes source, project hooks or lifecycle scripts. URL-like declarations/imports are redacted, and file/link dependency specifiers are replaced with a local-reference marker.
- Invalid manifests, non-ETS source syntax errors, I/O errors and exhausted limits fail the scan. Partial `.ets` syntax is retained only with explicit limitations. CLI exits 1 for fatal errors, prints a diagnostic on stderr and leaves stdout empty. Exit 0 means inventory was produced, **not** that compatibility passed.

The public TypeScript types live in [contracts](../packages/contracts/src/index.ts), with the strict [JSON Schema](../packages/contracts/scan-report.schema.json). The shared [core](../packages/core/src/index.ts) is the only scanner; [CLI](../apps/cli/src/index.ts) handles arguments and serialization. The schema is experimental and intentionally accepts only unknown inventory findings.

## Coverage and resource policy

- npm v2/v3 package-lock/shrinkwrap, pnpm v9 root importer/snapshot and Yarn Classic v1 and [Berry v8](YARN-BERRY-LOCKFILES.md) descriptor metadata are parsed into partial graphs; see [npm adapter](NPM-LOCKFILES.md), [npm workspace adapter](NPM-WORKSPACES.md), [pnpm adapter](PNPM-LOCKFILES.md) and [Yarn adapter](YARN-LOCKFILES.md). Selected [Yarn workspaces](YARN-WORKSPACES.md) receive manifest-validated module graphs. Other Berry/older pnpm formats, cross-workspace installation/link resolution, unregistered link targets, nested/OHPM manifests and source import resolution remain unimplemented. Declaration ranges must not be interpreted as installed versions.
- CommonJS exports/resolution, general dataflow/returned values, dynamic module bindings, global APIs, compatibility rules, replacements and build/runtime verification remain unimplemented. ETS inventory is partial: ArkUI DSL semantics, ArkTS type checking, SDK resolution, lifecycle rules and ETS const aliases are not evaluated.
- Hidden directories and node_modules/dist/build/coverage/vendor are excluded. `.gitignore` is not applied; the coverage report states this. Nested package manifests and encountered symlinks are reported as limitations. No installable artifact or real-world accuracy metric is claimed.
- Files and directory symlinks are skipped; a symlinked root manifest is rejected. Limits: 1 MiB per read file, 32 MiB total input, 10,000 visited entries, 64 directory levels; lockfile graphs also cap package/snapshot/importer records at 10,000 per table and effective edges at 20,000. Limit errors abort rather than presenting a partial report as complete.
- Scan a stable checkout. Concurrent hostile directory replacement is outside this local spike's isolation model. Reports include dependency names, module specifiers and relative filenames, so review them before sharing.

## Remaining gates

Issue #3 remains open for other Berry versions, unsupported workspace descriptor/glob shapes beyond bounded `*`/`**`, cross-workspace installation/range resolution, broader graph/source/dataflow analysis, target-aware evidence-backed rules and broader fixtures. Issue #11 remains open for independent benchmark/release gates; Stage0/1 branch protection and coverage gates are verified. M0 decisions D-01–D-10 and the DevEco/legacy audits retain their existing statuses; this spike does not approve licensing, acceptance methodology or platform support.

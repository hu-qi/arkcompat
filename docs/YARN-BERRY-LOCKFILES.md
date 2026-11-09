# Yarn Berry v8 descriptor inventory · Issue #3 / M1

The offline scanner now recognizes Berry `yarn.lock` with `__metadata.version: 8` and reports `yarn-berry-lockfile-partial`. Classic v1 retains its separate parser/coverage. This is a registry descriptor inventory, not an installed/PnP tree, runtime compatibility verification or complete workspace graph.

## Reproduce without installing scanned packages

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/yarn-berry-graph --runtime arkts --release 6.0.0
```

The authored fixture yields4 logical descriptor nodes and6 edges:4root edges, one missing optional native dependency and one locked transitive edge. The root peer edge is unsupported. This synthetic fixture is data; do not install it. Counts are not independent accuracy measurements or actual registry package claims.

The implementation follows [Yarn's pinned lockfile reader/writer](https://github.com/yarnpkg/berry/blob/8f638c0806ec8f3758adb13d93567fc782f9c903/packages/yarnpkg-core/sources/Project.ts): grouped descriptor keys point to a resolution, workspace/link type and dependency metadata are distinct, and virtual peer packages are derived rather than stored as a resolved peer graph. This reading informed an independent bounded adapter; no upstream implementation or compatibility dataset was copied. Existing pinned `yaml`2.9.1 parses data only; Yarn configuration, plugins, scripts, package manager or installed modules are never loaded/executed.

## Supported inventory semantics

- `npm:` registry descriptors and exact registry locators, including scoped package aliases. Node IDs are `yarn-berry:<descriptor>`; each grouped descriptor remains a distinct logical node, preserving requested and actual package names. Node count is not installed-package count.
- Root bare registry declarations normalize to `npm:` for exact lookup. Transitive descriptors require an exact matching key. No name-only/version fallback or range satisfaction is inferred; `locked` means a recorded version exists, not a valid install or compatibility judgment.
- `dependenciesMeta` with an unqualified dependency name and boolean optional flag preserves optional edge classification. Existing explicit optional overrides remain effective. Missing optional edges remain visible.
- Root/transitive peers remain unsupported because virtual peer contexts are not resolved. Conditions are retained as a not-evaluated limitation; they are not applied to guess OS/architecture eligibility.
- Workspace/soft links, patch/portal/file/URL/virtual and archive-parameterized locators are unsupported. A recorded unsupported locator yields an unsupported edge rather than a missing descriptor. Workspace manifests and their graphs remain pending.
- Versionless registry entries are inventoried but unsupported edge targets; contradictory name/version locator metadata aborts rather than choosing a winner. Other unsupported protocols produce explicit limitations.

Versions other than8 yield declaration-only coverage with unsupported-version and transitive-not-analyzed limitations. Legacy pre-v4 descriptor normalization is not implemented. A mixed Classic/Berry header is ambiguous and fails. Actual package-manager/OS/API support is not inferred from manifest/lock version numbers.

## Failure and privacy boundaries

Recognized malformed/ambiguous YAML, duplicate keys or expanded descriptors, unsupported YAML tags/aliases, invalid analyzed-registry dependency/optional metadata and merge conflicts abort with sanitized `yarn.lock` errors. No successful partial graph is returned on these failures. Source parser excerpts, resolution URLs, checksums and unsupported locator strings do not enter reports. Manifest patch/portal/exec/virtual references are now redacted as unsupported-protocol; existing URL/local redaction remains. Root workspace range declarations retain the existing inventory representation.

Bounds:10000expanded selectors,20000edges,16384characters/line,128indentation characters, plus shared1MiB/file,32MiB total reads,10000filesystem entries,64directory depth and symlink policies. These are engineering scan limits, not a general sandbox or complete Yarn-format auditor. Other Yarn metadata fields are not adjudicated.

## Experimental report schema migration0.5 →0.6

Schema0.6.0 adds `yarn-berry-lockfile-partial`; graph shape, finding IDs/status semantics and snapshots-none behavior are otherwise unchanged. Core/CLI, compiled Web validator/UI and MCP use the same contract. New Berry CLI/core/schema and real MCP/client→Web projection tests verify equality. Markdown/SARIF remain projections of the same canonical inventory.

Web import is strict and uses the current [0.7.0 contract](OHPM-LOCKFILES.md); it rejects historical 0.5.0 and 0.6.0 reports; rebuild all adapters and rescan the stable source checkout. Keep historical reports as historical artifacts instead of editing their version field. This is an experimental contract migration, not a supported published-version upgrade policy. Knowledge metadata schema remains0.1.0 and does not become active in the scanner.

Rollback by reverting the scoped Berry PR, rebuilding all consumers and regenerating schema0.5 reports. Earlier npm/pnpm/Classic adapters remain available; no package installation state was changed. Full workspaces, older pnpm/Berry formats, range/peer/hoisting resolution, broader source semantics, evidence-backed target rules and independent benchmarks still keep #3 open.

## Read-only public metadata observations · 2026-11-07

[Observation record and input/report hashes](evidence/yarn-berry-public-2026-11-07.json) pins two official Yarn repository commits. Only package.json/yarn.lock were downloaded into separate temporary directories as data; no source/plugin/package scripts were run and nothing was installed from those projects. Source manifests declare BSD-2-Clause. These are developer parser observations, not independent labels, installed trees or runtime support.

- Yarn4.0.0 tag resolves to `c6764b28f8e8dbdac7ad318d6d98b5d5f0f4679e`: actual v8 metadata yields29root declarations,2317logical descriptor nodes and5311edges (4937locked,1missing,373unsupported); schema0.6 is valid, sourceFiles0, all findings unknown.
- Upstream `8f638c0806ec8f3758adb13d93567fc782f9c903` uses actual v10 metadata:24root declarations,0nodes/edges and declaration-only coverage with explicit unsupported-version/transitive-not-analyzed limitations. It was not passed off as a v8 graph.

The first v8 probe exposed version-qualified workspace build metadata being validated as registry optional flags. A negative fixture reproduced it before the fix: unsupported workspace/protocol internals are now skipped before registry dependency/optional interpretation; analyzed registry metadata still fails closed. A second probe produced the counts above. Workspace internals remain unvalidated/unscanned, not newly supported. The record retains full missing/unsupported denominators and no80%/100% accuracy claim.

# pnpm v9 metadata graph · M1 / Issue #3

The [official pnpm v9 specification](https://github.com/pnpm/spec/blob/master/lockfile/9.0.md) separates package metadata, dependency snapshots and project importers. ArkCompat reads all validated importers and registry snapshots in `pnpm-lock.yaml` v9.0, and projects selected workspace importers into module-local graphs. It preserves the full peer suffix rather than combining every occurrence of a package/version into one node.

## Reproduce

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/pnpm-graph --runtime arkts --release 6.0.0
# Scan ArkCompat's root importer and selected pnpm workspace importers:
pnpm --silent scan . --runtime arkts --release 6.0.0
```

The authored fixture yields three snapshot nodes and five edges, including a scoped alias, a root peer and one missing optional dependency. All fixture metadata is synthetic; never install or execute it. A separate lockfile-only smoke with pinned pnpm 10.34.9 uses an alias and React peer relationship, producing seven nodes and ten locked edges without package installation or lifecycle scripts. Neither fixture nor smoke is an independent acceptance benchmark.

## Current contract

- `dependencyGraph.source` now also accepts `pnpm-lock.yaml`. Numeric `lockfileVersion` is 9 for pnpm v9.0; unimplemented older/future versions produce explicit uncertainty. Graph shape stays shared with npm, while coverage is `pnpm-lockfile-partial`.
- pnpm node IDs are `pnpm:<snapshot-key>`, including scoped names and nested peer suffixes. These are logical IDs, **not paths** to read. For pnpm snapshots, name/installName represent the registry identity; aliases are preserved in edge names. npm retains its installation-location IDs and installation names.
- Root and selected workspace edges use manifest sections/specifiers and importer versions. Automatically installed peers can be recorded under importer dependencies; graph edges retain their manifest peer section. Optional dependencies override same-named ordinary declarations for effective edges, while raw declaration inventory remains intact.
- Snapshot edges use exact recorded references. Where package metadata identifies a peer, the edge retains its declared peer range and a peerDependencies section, separately from the target node's recorded version. Declared peers absent from a snapshot become missing edges, including optional peers; this is uncertainty, not incompatibility.
- Both package metadata and a snapshot are required for a registry node. Missing records are reported; matching by package name alone never manufactures a resolved node. Different peer contexts remain distinct even when names/versions match.
- `locked` still means metadata reference found, not range satisfaction, actual installation, or HarmonyOS compatibility. Findings remain `unknown`; no rules, replacements or verified runtime claim is introduced.

Schema 0.3 introduced pnpm graph source/coverage/version values and ID semantics; 0.4 added Yarn Classic descriptor graphs. Schema 0.10.0 adds pnpm workspace module provenance. Current strict consumers of historical artifacts must rebuild and rescan; the [schema](../packages/contracts/scan-report.schema.json) and [types](../packages/contracts/src/index.ts) remain experimental.

## Selection and unsupported cases

When more than one npm/pnpm/Yarn lock family exists, `package.json` must declare a present packageManager. The selected manager's file is parsed; ignored content is not read. npm shrinkwrap still precedes package-lock. Without an explicit supported manager, ambiguous input fails. With only one supported lock family, that family is selected. Other/nested locks remain visible as unparsed limitations.

With a safe root `pnpm-workspace.yaml`, selected in-tree importers are matched to current manifests and projected independently; see [workspace scope and limits](PNPM-WORKSPACES.md). Link/file/workspace references remain explicitly unsupported. Remote registry/tarball/Git identities, patches/hash contexts, old pnpm formats, unsupported workspace selections, Yarn workspace descriptors, Yarn Berry and OHPM remain outside this adapter. Optional-peer/platform conditions, transitive peer policy, range satisfaction, settings/overrides policy and actual install integrity are not evaluated. Overlapping declarations across sections are compared conservatively and can require review.

## Parser and privacy boundary

The runtime adds pinned `yaml@2.9.1` (ISC) to parse YAML rather than implementing an ad hoc parser. No YAML/custom code is executed. Duplicate keys, malformed documents, unresolved tags, aliases and multiple documents fail with a sanitized filename-level diagnostic; source excerpts and parser warnings are not forwarded. Alias expansion is disabled. Unknown/remote snapshot identities never become report IDs, and resolved URLs/link targets are not serialized. This does not make arbitrary source/dependency names safe to share without review.

The shared bounded reader and graph limits apply: 1 MiB/file, 32 MiB total, 10,000 package/importer records, 20,000 importer dependencies and graph edges, bounded peer-context parsing and 128 discovered workspaces. Selected symlinks/special files fail without following targets. Stable-checkout isolation caveats from [the scanner scope](SCANNER-SLICE.md) remain. CLI errors leave stdout empty; exit zero only means inventory was produced.

## Verification and remaining gate

Regression tests cover nested peer identity, scoped aliases, root and workspace peer normalization, missing metadata/snapshots/peers, workspace links/symlinks, stale/missing/duplicate importers and manifests, patched/remote identities, cardinality, YAML ambiguity/aliases/tags, manager selection and deterministic CLI/schema parity. Existing npm/OHPM fixtures remain in the same suite. M1 stays open for remaining graph formats, cross-workspace link resolution, broader API/symbol analysis, deterministic compatibility rules and independently measured acceptance.

Schema 0.5.0 adds [source API call inventory](SOURCE-API-INVENTORY.md) alongside the existing lockfile graph; compatibility remains unknown.

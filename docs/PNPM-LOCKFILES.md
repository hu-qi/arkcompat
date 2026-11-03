# pnpm v9 metadata graph · M1 / Issue #3

The [official pnpm v9 specification](https://github.com/pnpm/spec/blob/master/lockfile/9.0.md) separates package metadata, dependency snapshots and project importers. ArkCompat now reads the root importer (`.`) and registry snapshots in `pnpm-lock.yaml` v9.0. It preserves the full peer suffix rather than combining every occurrence of a package/version into one node.

## Reproduce

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/pnpm-graph --runtime arkts --release 6.0.0
# Scan ArkCompat's own root importer; workspace links stay unsupported:
pnpm --silent scan . --runtime arkts --release 6.0.0
```

The authored fixture yields three snapshot nodes and five edges, including a scoped alias, a root peer and one missing optional dependency. All fixture metadata is synthetic; never install or execute it. A separate lockfile-only smoke with pinned pnpm 10.34.9 uses an alias and React peer relationship, producing seven nodes and ten locked edges without package installation or lifecycle scripts. Neither fixture nor smoke is an independent acceptance benchmark.

## Contract 0.3.0

- `dependencyGraph.source` now also accepts `pnpm-lock.yaml`. Numeric `lockfileVersion` is 9 for pnpm v9.0; unimplemented older/future versions produce explicit uncertainty. Graph shape stays shared with npm, while coverage is `pnpm-lockfile-partial`.
- pnpm node IDs are `pnpm:<snapshot-key>`, including scoped names and nested peer suffixes. These are logical IDs, **not paths** to read. For pnpm snapshots, name/installName represent the registry identity; aliases are preserved in edge names. npm retains its installation-location IDs and installation names.
- Root edges use manifest sections/specifiers and importer versions. Automatically installed root peers can be recorded under importer dependencies; graph edges retain their manifest peer section. Optional dependencies override same-named ordinary declarations for effective edges, while raw declaration inventory remains intact.
- Snapshot edges use exact recorded references. Where package metadata identifies a peer, the edge retains its declared peer range and a peerDependencies section, separately from the target node's recorded version. Declared peers absent from a snapshot become missing edges, including optional peers; this is uncertainty, not incompatibility.
- Both package metadata and a snapshot are required for a registry node. Missing records are reported; matching by package name alone never manufactures a resolved node. Different peer contexts remain distinct even when names/versions match.
- `locked` still means metadata reference found, not range satisfaction, actual installation, or HarmonyOS compatibility. Findings remain `unknown`; no rules, replacements or verified runtime claim is introduced.

Schema 0.3.0 expands graph source/coverage/version values and ID semantics; 0.1/0.2 consumers must update. The strict [schema](../packages/contracts/scan-report.schema.json) and [types](../packages/contracts/src/index.ts) remain experimental.

## Selection and unsupported cases

When both npm and pnpm lock families exist, `package.json` must declare an npm or pnpm packageManager. The selected manager's file is parsed; ignored content is not read. npm shrinkwrap still precedes package-lock. Without an explicit supported manager, ambiguous input fails. With only one supported lock family, that family is selected. Other/nested locks remain visible as unparsed limitations.

Workspace importers other than `.` are surfaced but not traversed. Link/file/workspace references, remote registry/tarball/Git identities, patches/hash contexts, old pnpm formats, complete workspace graphs and Yarn/OHPM remain unsupported. Optional-peer/platform conditions, transitive peer policy, range satisfaction, settings/overrides policy and actual install integrity are not evaluated. Overlapping declarations across sections are compared conservatively and can require review.

## Parser and privacy boundary

The runtime adds pinned `yaml@2.9.1` (ISC) to parse YAML rather than implementing an ad hoc parser. No YAML/custom code is executed. Duplicate keys, malformed documents, unresolved tags, aliases and multiple documents fail with a sanitized filename-level diagnostic; source excerpts and parser warnings are not forwarded. Alias expansion is disabled. Unknown/remote snapshot identities never become report IDs, and resolved URLs/link targets are not serialized. This does not make arbitrary source/dependency names safe to share without review.

The shared bounded reader and graph limits apply: 1 MiB/file, 32 MiB total, 10,000 entries/records per graph table, 20,000 edges, bounded peer-context parsing. Selected symlinks/special files fail without following targets. Stable-checkout isolation caveats from [the scanner scope](SCANNER-SLICE.md) remain. CLI errors leave stdout empty; exit zero only means inventory was produced.

## Verification and remaining gate

Regression tests cover nested peer identity, scoped aliases, root peer normalization, missing metadata/snapshots/peers, workspace links/importers, stale declarations, patched/remote identities, cardinality, YAML ambiguity/aliases/tags, manager selection, symlinks and deterministic CLI/schema parity. Existing npm fixtures remain in the same suite. M1 stays open for remaining graph formats, full workspace resolution, API/symbol analysis, deterministic compatibility rules and independently measured acceptance.

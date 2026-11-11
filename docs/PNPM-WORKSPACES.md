# Bounded pnpm workspace inventory · Issue #3 / M1

ArkCompat now reads safe `pnpm-workspace.yaml` selections, inventories selected
in-tree `package.json` manifests and projects each lockfile v9 importer into a
module-local graph. It never installs packages, follows workspace links, reads
`node_modules` or executes analyzed scripts/source.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/pnpm-workspaces \
  --runtime arkts --release 6.0.0 --api-level 20
```

The authored fixture has two workspaces. The root lock records an unsupported
workspace-link edge to `packages/alpha`. That module receives three scoped
direct edges: its `packages/beta` link remains unsupported, its registry
dependency resolves to the recorded snapshot, and that snapshot's transitive
dependency remains within the module projection. `packages/beta` reports an
empty partial graph. Every compatibility finding remains `unknown`.

This fixture is authored regression evidence, not an installation check,
runtime test or independent accuracy workload.

Two CLI scans of the fixture produced byte-identical Schema 0.10.0 reports with
SHA-256
`f560014706c675529d4ac057c3f6f68f2a7db36f8b93386d3ae3fa5e25b1f7f0`.
Two scans of this repository's real root lock projected all nine selected
workspaces, 2,922 `unknown` findings and 88 source files with byte-identical
SHA-256
`046cfbf5399331a89c043f4f53744d17ed36e7650b204f477285c7c3add558f2`.
The real scan proves parser/projection behavior on the checked-in lock without
installing packages or reading `node_modules`; it is not an independent
package-resolution or compatibility measurement.

## Discovery boundary

- Root `pnpm-workspace.yaml.packages` must be an array of nonempty strings.
  Exact relative directories, `./` normalization and `*` segments are
  supported. Duplicate selections are deduplicated.
- Discovery stops at 128 selected workspace directories. Only non-hidden,
  non-excluded in-tree directories with regular, size-bounded `package.json`
  files are read. Symlinks and special files are never followed.
- Absolute, escaping, URL, backslash, NUL, excluded-directory and unsupported
  glob syntax is rejected or disclosed without serializing the unsafe value.
  Negated patterns, brace expansion, extglobs, `**`, dot segments and glob
  characters embedded in a segment remain outside this boundary.
- A malformed recognized config or malformed discovered manifest fails the
  scan. Missing/unavailable directories and manifests, anonymous or
  versionless workspaces, duplicate names, unmatched selections/importers and
  excessive selections remain explicit limitations.
- The config parser rejects duplicate keys, aliases, tags, malformed documents
  and multiple documents with a sanitized filename-level diagnostic.

## Importer projection

Before a workspace importer receives graph coverage, the current manifest's
effective declarations must match the lock importer entry-for-entry. Exact
specifiers are required; automatically installed peer declarations can match
their recorded importer `dependencies` entry while retaining the manifest
`peerDependencies` section. Missing, extra, reordered or stale entries remain
`declarations-only` and report `pnpm-workspace-manifest-lock-mismatch`.

Each validated importer starts at an empty module-local origin. Direct edges use
manifest sections/specifiers plus the importer's exact locked reference.
Registry snapshots preserve their full peer-context identity, and only edges
reachable from that importer are copied into the module graph. Empty and cyclic
graphs remain deterministic.

`workspace:`, `file:` and `link:` dependencies stay `unsupported`; recorded
link targets and raw local paths are not serialized. The scanner does not infer
that a workspace link exists, is installed, satisfies a range or transfers
package metadata from another manifest. Anonymous/duplicate/versionless
workspaces, missing importers, importer paths outside selected safe
directories and unparsed lock versions remain declarations-only.

Ranges, peer satisfaction, optional/platform conditions, overrides/settings,
integrity and installation state remain unverified. Root and module graphs do
not assert HarmonyOS compatibility.

## Contract migration

Schema `0.10.0` adds `kind: "pnpm"` and binds it to
`declarations-only | pnpm-lockfile-partial` coverage. Historical `0.9.0`
artifacts remain historical. CLI, Web, VS Code and other strict consumers must
be rebuilt together and stable projects rescanned; rewriting an old artifact's
version field is unsupported.

Rollback by reverting the scoped pnpm workspace changes, rebuilding all
consumers and regenerating `0.10.0` reports. The root importer/snapshot graph
and npm/OHPM workspace inventories remain independent; no installation state
was changed.

Full Yarn workspace graphs, unsupported pnpm glob/negation variants,
cross-workspace link resolution, version-range and peer/hoisting verification,
broader source/dataflow coverage and independent M1 acceptance remain Issue #3
work.

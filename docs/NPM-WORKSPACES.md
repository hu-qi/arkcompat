# Bounded npm workspace inventory · Issue #3 / M1

The npm adapter now reads root `package.json.workspaces`, inventories safe
in-tree workspace manifests and projects each workspace's recorded npm v2/v3
lock edges. This closes a previously explicit `workspace-package-not-analyzed`
gap without installing links, reading `node_modules` or asserting compatibility.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/npm-workspaces \
  --runtime arkts --release 6.0.0 --api-level 20
```

The checked-in fixture has two workspaces. The root graph records one
unsupported incoming workspace-link edge. `packages/alpha` receives three
scoped direct edges: its workspace dependency remains unsupported, its external
dependency resolves to the recorded workspace-local `1.9.0` location, and its
development dependency resolves to the hoisted location. `packages/beta`
reports an empty partial graph. All compatibility findings remain `unknown`.
The fixture is authored regression evidence, not an install or accuracy
benchmark.

Two scans of that fixture produced byte-identical historical Schema 0.9.0 JSON with SHA-256
`a3c381bf72963f05aa68512f0eb97061666ab57c0a301024018d938a265d2ed0`.
A separate npm 10.9.9 `--package-lock-only --ignore-scripts --no-audit
--no-fund` smoke generated a v3 root lock without installing packages; its
scanner report recorded two root nodes/edges and one module-local edge with
SHA-256
`cfc4021d230b513ddc6755cb711d21a385af89a0d6e42e4b0867116aa4386282`.
These are developer regressions, not an independent workload or acceptance
metric.

The exact PR head, merged-main workflow, report hashes and scoped coverage are
recorded in [machine-readable evidence](evidence/npm-workspaces-2026-11-11.json).

## Discovery boundary

- `workspaces` may be a string array or an object with a `packages` string
  array. Exact relative directories and `*` path segments are supported.
  `./` is normalized, paths are deduplicated, and discovery stops at 128
  selections.
- Only non-hidden, non-excluded in-tree directories with regular, size-bounded
  `package.json` files are read. Absolute, escaping, URL, backslash, NUL,
  excluded-directory and unsupported glob syntax is rejected or disclosed.
  Symlinks and special files are never followed.
- Malformed recognized selections or malformed discovered workspace manifests
  fail the scan rather than returning partial success. Missing/unavailable
  directories and manifests, `nohoist`, excessive selections and glob gaps are
  explicit limitations.
- Discovery supports one `*` per path segment, including multiple wildcard
  segments. Brace expansion, extglobs, `**`, dot segments and glob characters
  embedded in a segment are outside the supported boundary.

The package-manager selection rules remain unchanged. npm workspace discovery
runs only when the selected lock family is npm or when no npm/pnpm/Yarn lock is
selected. pnpm workspace importers now have a separate bounded
[adapter](PNPM-WORKSPACES.md); Yarn workspace descriptors retain their separate
explicit limitation.

## Lock projection

Each discovered workspace becomes an entry in the existing `modules` array with
`kind: "npm"`. Its current manifest declarations receive normal
`inventory.dependency` locations under the workspace path. When the root lock
contains exactly one safe local-link record whose target, package name, version
and effective declarations match the current manifest, the report includes:

- nodes reachable from that workspace's recorded link edges;
- direct workspace edges re-originated at the module-local empty origin;
- recorded transitive/cyclic edges with their original installation IDs;
- `npm-lockfile-partial` coverage and the root lock source/version.

Due to npm's recorded local-link model, an edge to another workspace link stays
`unsupported`; the scanner does not claim the link is installed or active.
Ranges, peer/optional conditions, integrity and installation state remain
unverified. Duplicate workspace names, missing workspace names or versions,
multiple aliases for one target, missing lock records, stale
name/version/declaration metadata and unmatched links remain
`declarations-only` with no borrowed edges.

Workspace-local lockfiles are not merged into the root graph. No package
lifecycle script, registry request, installation command or workspace source
execution occurs.

## Contract migration

Schema `0.9.0` generalized `modules[]` to npm and OHPM inventories; schema
`0.10.0` adds `kind: "pnpm"` and `pnpm-lockfile-partial` coverage. Every module
declares its package manager, and each kind is constrained to its matching
coverage values. Historical `0.8.0` and `0.9.0` artifacts keep their original
version; strict CLI, Web, VS Code and other consumers must be rebuilt together
and rescan the stable checkout. Rewriting an old artifact's version is not
supported.

Rollback by reverting the scoped workspace PRs, rebuilding all consumers and
regenerating `0.10.0` reports. Existing root npm graphs and OHPM module
inventory remain independent; no package installation state was changed.

Full pnpm/Yarn workspace graphs, unsupported npm glob variants, arbitrary
workspace-local lock trees, version-range/peer/hoisting verification, broader
source/dataflow coverage and independent acceptance remain Issue #3 work.

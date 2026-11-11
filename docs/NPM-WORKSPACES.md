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

The bounded globstar slice has its own authored
[fixture](../fixtures/developer/workspace-globstar) and
[machine-readable evidence](evidence/workspace-globstar-2026-11-11.json).
`packages/**/components/*` selects both the zero-segment
`packages/components/direct` workspace and the multi-segment
`packages/team-a/components/nested` workspace while excluding an unrelated
manifest outside the tail glob. The two deterministic declarations-only scans
produced SHA-256
`6cfc2b61ec551b6fb3cdd84770e0b4ccfc5cbc7644bfe97177bc6118ec1a7026`.

[PR #65](https://github.com/hu-qi/arkcompat/pull/65) passed all five required
[PR checks](https://github.com/hu-qi/arkcompat/actions/runs/42991826490) at
`dadfa215e74989c1c815294fc8d0803cd0479fdc` and
[merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/42992096039)
as merge `de4e9356a32ed798ed0c60221cd7b9bff4df5d5b`.

The bounded comma-list brace slice has its own authored
[fixture](../fixtures/developer/workspace-braces). The pattern
`{apps/alpha,packages/team-{a,b}/*}` expands to three selected workspaces,
including a nested brace and an alternative containing a wildcard.
`packages/other/delta` remains outside the selected module set and is disclosed
only through the existing unselected nested-manifest limitation. Two source
CLI scans were byte-identical at SHA-256
`d7a06525aa4ea2ec3d016ce7bf7544906b78affee71161e179a386c96f3d5225`.
Source, portable and VSIX-embedded CLIs produced the same report bytes.

[PR #70](https://github.com/hu-qi/arkcompat/pull/70) passed all five required
[PR checks](https://github.com/hu-qi/arkcompat/actions/runs/43007259714) at
`552d9a4d61fdaf15cbfb149bd7eb6c6d64bcf24b` and
[merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/43007485825)
as merge `3ee0accd170b676c3cb48369f75c901c8211d2f3`. CodeRabbit skipped
automatic review; CI is engineering evidence, not independent acceptance.
Exact host probes, artifact hashes and boundaries are recorded in
[machine-readable evidence](evidence/workspace-braces-2026-11-11.json).

The bounded sequence slice has an authored
[fixture](../fixtures/developer/workspace-sequences). Its npm patterns
`modules/numeric-{01..03}`, `modules/alpha-{a..c..2}` and
`modules/reverse-{3..1}` select eight workspaces while excluding
`numeric-04`, `alpha-b` and unrelated manifests. Two source scans produced
the byte-identical Schema `0.12.0` report SHA-256
`397eacc68d259a3ef9236b8072cc8e94105409c35397e076aa217b579e599c38`.
Source, portable and VSIX-embedded CLIs produced the same bytes.

[PR #72](https://github.com/hu-qi/arkcompat/pull/72) passed all five required
[PR checks](https://github.com/hu-qi/arkcompat/actions/runs/43011182615) at
`0ba04006b82500cd6180350132297a1cb21420ef` and
[merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/43011443701)
as merge `94544e32f86867dbcb6b704008c7d59c509d6949`. A separate npm 10.9.9
lock-only probe selected all eight intended paths with the same three patterns.
Exact host differences, artifact hashes and boundaries are recorded in
[machine-readable evidence](evidence/workspace-sequences-2026-11-11.json).

The bounded segment-pattern slice adds an authored
[fixture](../fixtures/developer/workspace-character-globs). Its four patterns
combine a positive character class (`[ab]`), a single-character wildcard (`?`),
a negated character class (`[!a]`) and a wildcard embedded beside a literal
(`feature-*`). npm 10.9.9, pnpm 10.34.9 and Yarn 4.0.0 independently selected
the same eight directories and excluded `c-app`, `service-xy`, `team-a` and
`other`. Two source scans produced the byte-identical Schema `0.12.0` report
SHA-256
`8090ab217787a4293ced6ac99b9851a229abf1d75eb5d88d7179fa6820c5cf87`.
Source, portable and VSIX-embedded CLIs produced the same bytes. Exact host
outputs, fixture hashes, artifact provenance and implementation bounds are
recorded in
[machine-readable evidence](evidence/workspace-character-globs-2026-11-11.json).

## Discovery boundary

- `workspaces` may be a string array or an object with a `packages` string
  array. Exact relative directories, `*` for one segment and `**` for zero or
  more segments are supported. After nested or adjacent comma-list brace
  expansion, individual path segments also support `?` (one character), `*`
  embedded beside literals, positive classes such as `[ab]`, and negated
  classes such as `[!a]`. npm sequence groups use bounded
  `brace-expansion@5.0.12`; the authored zero-padded numeric, alphabetic-step
  and descending forms are supported. One authored selection is limited to 64
  expanded patterns. `./` is normalized, expanded patterns and paths are
  deduplicated, and discovery stops at 128 selections.
- Only non-hidden, non-excluded in-tree directories with regular, size-bounded
  `package.json` files are read. Absolute, escaping, URL, backslash, NUL,
  excluded-directory and unsupported glob syntax is rejected or disclosed.
  Symlinks and special files are never followed.
- Malformed recognized selections or malformed discovered workspace manifests
  fail the scan rather than returning partial success. Missing/unavailable
  directories and manifests, `nohoist`, excessive selections and glob gaps are
  explicit limitations.
- Discovery accepts multiple `*` and `**` segments. A terminal globstar selects
  directories containing a `package.json` rather than reporting every ordinary
  descendant as a failed workspace. Shared wildcard traversal stops after
  4,096 directory reads. Empty or malformed brace alternatives, expansions
  above the 64-pattern cap, extglobs, whole-pattern negation, malformed or
  reversed character classes, dot segments, and other unvalidated syntax remain
  outside the supported boundary. A segment is capped at 256 characters and 32
  wildcard/class tokens; rejected syntax is disclosed without serializing the
  raw pattern.

The package-manager selection rules remain unchanged. npm workspace discovery
runs only when the selected lock family is npm or when no npm/pnpm/Yarn lock is
selected. pnpm and Yarn workspaces have separate bounded
[pnpm](PNPM-WORKSPACES.md) and [Yarn](YARN-WORKSPACES.md) adapters.

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

Schema `0.9.0` generalized `modules[]` to npm and OHPM inventories;
`0.10.0` added pnpm, `0.11.0` added Yarn and `0.12.0` added semver
`mismatch` alongside its manager-specific
coverage. Every module declares its package manager, and each kind is
constrained to its matching coverage values. Historical reports keep their
original version; strict CLI, Web, VS Code and other consumers must be rebuilt
together and scan the stable checkout again. Rewriting an old artifact's
version is not supported.

Rollback by reverting the scoped workspace PRs, rebuilding all consumers and
regenerating `0.12.0` reports. Existing root npm graphs and OHPM module
inventory remain independent; no package installation state was changed.

Cross-workspace installation/link resolution, remaining npm/pnpm/Yarn glob
variants including unsupported sequence forms and extglobs, arbitrary
workspace-local lock trees, tags/non-semver range and peer/hoisting
verification, broader source/dataflow coverage and independent acceptance
remain Issue #3 work.

# Legacy Baseline Audit · Not Yet Imported

**Candidate:** [hu-qi/ohpm-npm-compat-assistant PR #2](https://github.com/hu-qi/ohpm-npm-compat-assistant/pull/2) (still open when checked on 2026-11-02).

## Observed, not yet independently verified

The PR describes a TypeScript CLI with dependency scan, AST API scan, compatibility rule engine, replacement knowledge, JSON/Markdown reports and fixtures. It claims 24 passing unit tests and 100% on self-provided sample accuracy metrics. GitHub diff lists the source, fixture and test files. No cross-repository port or independent test has been performed.

**These claims must not be reflected as ArkCompat shipped capabilities or acceptance results.**

## Migration checklist

- [ ] Confirm the commit SHA and scope of the old PR; review source and tests line-by-line.
- [ ] Verify licensing/permissions, package dependencies, generated data and source attribution.
- [ ] Execute tests independently in pinned Node/pnpm environments and record logs.
- [ ] Validate scanner on disjoint public projects: lockfile semantics, aliases/workspaces, dynamic import, false positives and version selection.
- [ ] Review API matrix against real HarmonyOS SDK and run-time profile, not undocumented heuristics.
- [ ] Independently validate each NPM/OHPM substitution and label source; remove unverified claims.
- [ ] Evaluate security boundaries: untrusted repository scripts, path traversal, remote source leakage.
- [ ] Migrate only selected packages/fixtures through separately reviewed PRs with test evidence and upstream attribution.
- [ ] Compare baseline before/after using a frozen external holdout.

## Potential reusable pieces (to evaluate)

- Lockfile readers and dependency graph normalization.
- Source analyzer patterns and fixtures.
- Deterministic report models and tests.
- CI workflow ideas; old PR notes workflow push-permission limitations.

## Explicitly not approved by this audit draft

No claim that old project meets any Huawei acceptance metric; no implicit approval of its rule truthfulness or replacement correctness; no reuse of self-generated metrics as an external benchmark.

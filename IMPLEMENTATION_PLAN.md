# IMPLEMENTATION_PLAN — v0.1.0 review remediation and CI closure

Tracking: Issue #8 (M6 reproducible artifacts/install/docs); related #5, #6, #11.
Branch: `codex/v0.1.0-release-verification`, base `main` at `018b014`.

Scope boundary: no release/tag/asset mutation, no Huawei evaluation, no accuracy
adjudication, no knowledge promotion, no license/distribution policy change, no
merge to main, no public patch release. Human decisions D-05/D-08 stay recorded.

## Stage 1: fix concrete review findings with behavior tests first

**Goal**: Close three code-level review findings with regression tests that fail
on the old behavior and pass on the fix.

**Success criteria**:
- `scripts/package-release.mjs` builds tar.gz archives without GNU-only flags;
  GNU tar 1.35 (Ubuntu 24.04) rejects the old invocation before the fix. Fixed
  mtime/ownership/entry order and gzip timestamp determinism are preserved.
- `packages/knowledge` schema resolution only falls back on `ENOENT`; permission,
  directory and I/O errors surface with path and cause.
- Web artifact prerequisite/error handling and VSIX ZIP normalization reviewed;
  only proven scoped defects changed.

**Tests**:
- Deterministic tar behavior: two builds byte-identical, normalized metadata,
  safe entry names, special-file rejection.
- Schema resolution: missing primary + valid fallback; non-ENOENT primary error
  is not bypassed; both absent produces a meaningful error.

**Status**: Complete

## Stage 2: add engineering packaging gate and run existing gates

**Goal**: A real release-packaging CI gate on Linux and macOS plus local gates.

**Success criteria**:
- CI packages the release twice from the same clean SHA per runner, verifies
  `SHA256SUMS`, expected artifact sets (DevEco explicitly absent in CI), safe
  archive contents, CLI provenance, and CLI/Web standalone smoke.
- Within-runner byte reproducibility and cross-runner functional parity are
  reported as distinct facts.
- `pnpm check` passes locally; targeted negative tests pass.

**Tests**: `pnpm check`, targeted `vitest` files, local double packaging and
`scripts/verify-release.mjs`.

**Status**: Complete

## Stage 3: reconcile evidence and open/review Draft PR

**Goal**: Correct misattributed evidence, reconcile follow-ups, add this run's
manifest, and land a Draft PR whose checks pass.

**Success criteria**:
- F-04 is attributed to the fix candidate, not the downloaded v0.1.0 release.
- FOLLOWUPS reflects D-05/D-08 and keeps optional expansion non-blocking.
- New dated evidence manifest binds commands, exits, input SHA, hashes, runtime.
- Draft PR opened with problem/behavior/tests/evidence/uncertainty/rollback.

**Tests**: `node scripts/validate-docs.mjs`; latest-head GitHub Actions checks.

**Status**: In Progress

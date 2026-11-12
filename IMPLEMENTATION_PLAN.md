## Stage 1: Reconcile current evidence
**Goal**: Confirm the merged PR, current main SHA, CI runs and remaining gates.
**Success Criteria**: Every updated document uses the same immutable evidence.
**Tests**: GitHub PR/run inspection and remote SHA read-back.
**Status**: Complete

## Stage 2: Refresh execution documents
**Goal**: Make the permanent TODO an actionable queue with the current SHA, open Issue
matrix, explicit READY/GATED/BLOCKED states, commands, evidence paths and close
conditions. Reconcile the project-level views without rewriting historical audit
evidence.
**Success Criteria**: No current-status document claims that engineering has no
READY work; formal acceptance remains 0/5 and human decisions remain 0/10.
**Tests**: Search for stale baseline/status text, verify links and inspect the
complete diff.
**Status**: Complete

## Stage 3: Implement the next READY engineering slice
**Goal**: Track static CommonJS `module.exports` and `exports.member` assignments
for Issue #3 with explicit uncertainty for unsupported dynamic, mutation and
cross-file cases.
**Success Criteria**: Focused tests cover supported and unsupported exports; report
limitations remain truthful; documentation describes the inventory boundary.
**Tests**: `pnpm exec vitest run tests/source-api.test.ts tests/scan.test.ts`;
`pnpm check`.
**Status**: Not Started

## Stage 4: Validate and deliver both increments
**Goal**: Merge the documentation and CommonJS changes through reviewed PRs, verify
main and synchronize AtomGit.
**Success Criteria**: Five required checks pass for each PR and main run; GitHub and
AtomGit expose the same final SHA; Issue #1 and #3 receive evidence without false
closure.
**Tests**: `git diff --check`, `pnpm check`, GitHub checks and remote SHA read-back.
**Status**: In Progress

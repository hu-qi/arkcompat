# Offline snapshot CI gate · Issue #11 / M5–M6

Scope: Stage 2 rules/knowledge provenance structure, pinned integrity and canonical export checks for the two existing bundled snapshots. No new data import, reviewed mapping promotion, runtime/accuracy acceptance or release publication.

## Stage 1: Define and reproduce gate failures
**Goal**: Add behavior tests and a pinned inventory for bundled data.
**Success Criteria**: Valid inputs succeed deterministically; corrupt, unlisted, unsafe and falsely promoted inputs fail.
**Tests**: Gate CLI tests for digest drift, provenance, canonical export, rule semantics, candidate-only policy and file safety.
**Status**: Complete

## Stage 2: Implement and wire the required CI check
**Goal**: Reuse existing knowledge/rule validators; emit bounded machine-readable evidence and run in GitHub Actions.
**Success Criteria**: pnpm check passes; standalone check validates both snapshots; CI retains an evidence artifact and a negative/recovery probe without executing package scripts.
**Tests**: Full quality suite, workflow lint, real PR Actions and gate artifact read-back.
**Status**: Complete

## Stage 3: Review, enforce and synchronize
**Goal**: Obtain review, pass CI, add the new check to existing strict protection, merge and update verified progress.
**Success Criteria**: Required status is read back; actual PR/main runs pass; GitHub/AtomGit/GitCode main match; work packages and formal acceptance are not inflated.
**Tests**: gh pr checks, protection read-back, artifact inspection, remote SHA read-back, document integrity.
**Status**: In Progress

# Documentation Baseline Alignment

## Stage 1: Align the permanent execution documents

**Goal**: Record the current documentation commit and the latest complete code
regression as separate, verifiable baselines.

**Success Criteria**: `TODO.md` and the six permanent project-control documents
name `4a6de52` and run `43204842537` as current main, while retaining `511790b`
and run `43202341237` as the complete code regression baseline.

**Tests**: Documentation integrity, formatting, links and the full repository
quality suite.

**Status**: Complete

## Stage 2: Review the documentation-only change

**Goal**: Open a scoped PR, obtain all five required checks, and merge normally.

**Success Criteria**: The PR changes only the seven permanent execution
documents plus this temporary plan, all required jobs pass, and the merge commit
is the new GitHub main.

**Tests**: Local `pnpm check`, `git diff --check`, PR checks and merged-main
quality run.

**Status**: In Progress

## Stage 3: Verify the final remote state

**Goal**: Synchronize AtomGit and verify both remotes point to the final main.

**Success Criteria**: GitHub and AtomGit `main` resolve to the same merge commit,
no PR remains open, and this temporary plan is removed before handoff.

**Tests**: Independent `git ls-remote` reads and open-PR query.

**Status**: Not Started

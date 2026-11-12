## Stage 1: Establish the current baseline
**Goal**: Confirm the latest main commit, open Issue set, and CI state.
**Success Criteria**: Record the authoritative SHA and distinguish engineering from acceptance status.
**Tests**: Compare the archive with GitHub metadata and inspect the main quality run.
**Status**: Complete

## Stage 2: Complete the master execution document
**Goal**: Extend `TODO.md` with checkboxes, dependencies, dates, Issue closure fields, and ownership.
**Success Criteria**: Every remaining engineering, human, evaluation, product, and release activity has a concrete close condition.
**Tests**: Review links, ordering, status wording, and the AtomGit/GitCode boundary.
**Status**: Complete

## Stage 3: Validate and deliver
**Goal**: Run documentation integrity and the full quality suite, then merge through the normal PR process.
**Success Criteria**: Required checks pass and the permanent execution entry is updated without claiming unearned acceptance.
**Tests**: `node scripts/validate-docs.mjs`, `pnpm check`, and `git diff --check`.
**Status**: In Progress

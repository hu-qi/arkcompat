## Stage 1: Make the project TODO operational
**Goal**: Make root `TODO.md` the single execution entry with a current verified
baseline, four concrete READY work packages, explicit evidence and Issue closure
conditions.
**Success Criteria**: Every READY item has one owning Issue, copyable commands,
expected artifacts, an evidence destination and a testable completion condition;
all eight open Issues map to their remaining closure evidence.
**Tests**: Markdown link validation and manual review against the original Issue
bodies.
**Status**: Complete

## Stage 2: Reconcile supporting project documents
**Goal**: Remove stale baseline claims and make the purpose of the execution
ledger, completion plan, action list, master register and sign-off package
unambiguous.
**Success Criteria**: README, delivery status and all project-control documents
point to the same last verified baseline and identify `TODO.md` as the execution
entry; no document implies that CI or local evidence is formal acceptance.
**Tests**: Repository-wide search for obsolete baseline/run IDs; documentation
integrity check.
**Status**: Complete

## Stage 3: Verify and publish the documentation change
**Goal**: Merge the documentation update through the required PR checks and
synchronize the merged commit to AtomGit.
**Success Criteria**: `pnpm check` passes locally, all five required GitHub
Actions jobs pass, the PR merges normally, and GitHub and AtomGit resolve the
same resulting `main` SHA.
**Tests**: `pnpm check`; `gh pr checks`; merged-main workflow; `git ls-remote`.
**Status**: In Progress

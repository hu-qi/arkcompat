## Stage 1: Reconcile the control documents
**Goal**: Make the TODO, project register, execution ledger, sign-off package, and README use one current baseline and one definition of READY work.
**Success Criteria**: M1-06 appears as completed engineering evidence, the remaining READY queue contains exactly M3-04, M3-05, M5-05, and M5-07, and stale baseline references are removed.
**Tests**: Search for stale counts and SHAs; `git diff --check`.
**Status**: Complete

## Stage 2: Validate documentation
**Goal**: Ensure all required documents and local links are valid.
**Success Criteria**: Documentation integrity passes and the complete project quality gate remains green.
**Tests**: `node scripts/validate-docs.mjs`; `pnpm check`.
**Status**: Complete

## Stage 3: Publish and synchronize
**Goal**: Merge the documentation update through protected GitHub CI and synchronize the resulting main commit to AtomGit.
**Success Criteria**: All five PR and main jobs pass, the PR is merged, and GitHub plus AtomGit read back the same SHA.
**Tests**: GitHub Actions run status and `git ls-remote`.
**Status**: In Progress

## Stage 4: Report the actionable project plan
**Goal**: Give the user direct links to the concrete TODO, Issue closure, decision, execution, and sign-off documents without overstating acceptance.
**Success Criteria**: The final response names the immediate engineering queue and the remaining formal acceptance and release gates.
**Tests**: Verify each linked path and commit-pinned GitHub URL.
**Status**: Not Started

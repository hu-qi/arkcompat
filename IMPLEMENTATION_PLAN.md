## Stage 1: Synchronize the documented engineering baseline
**Goal**: Replace stale commit and quality-run references in the permanent project execution documents.
**Success Criteria**: Every project planning document names `511790bcdac6f19bbc0dc53089336c16aeae9896` and run `43202341237`.
**Tests**: Search for the old SHA/run; run documentation integrity checks.
**Status**: In Progress

## Stage 2: Verify document consistency
**Goal**: Confirm the document set still has clear ownership, executable commands, and honest acceptance status.
**Success Criteria**: Links resolve, required metadata exists, and no document claims formal acceptance.
**Tests**: `pnpm check` and `git diff --check`.
**Status**: Not Started

## Stage 3: Deliver through the protected repository workflow
**Goal**: Merge the documentation correction after all required checks and synchronize AtomGit.
**Success Criteria**: PR checks and merged-main checks pass; GitHub and AtomGit read back the same merge SHA.
**Tests**: GitHub Actions `quality` jobs and remote `ls-remote` read-back.
**Status**: Not Started

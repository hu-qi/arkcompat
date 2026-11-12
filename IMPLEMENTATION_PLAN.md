## Stage 1: Audit the existing project plan

**Goal**: Compare the proposed master TODO with the current roadmap, issue list,
acceptance package, execution ledger, and temporary checklist.

**Success Criteria**: Every open issue has a close condition; engineering work and
human gates are separated; release and synchronization steps are explicit.

**Tests**: Inspect the rendered source, verify the recorded baseline against Git
and GitHub Actions, and confirm the current open-issue set.

**Status**: Complete

## Stage 2: Publish one executable master TODO

**Goal**: Add a concise project-level TODO and link it from the existing planning
entry points without replacing detailed evidence ledgers.

**Success Criteria**: `docs/PROJECT-MASTER-TODO.md` describes execution order,
issue status, READY and GATED work, acceptance metrics, release, evidence, and
completion conditions; README and TODO link to it.

**Tests**: Run the documentation validator and check every local link and
referenced anchor.

**Status**: In Progress

## Stage 3: Run the full quality gate

**Goal**: Verify formatting, lint, types, unit and integration tests, coverage,
documentation integrity, and generated build output.

**Success Criteria**: `pnpm check` passes on the final branch commit.

**Tests**: Full `pnpm check`, followed by the five required GitHub Actions jobs.

**Status**: Not Started

## Stage 4: Merge and synchronize

**Goal**: Merge the reviewed documentation change and keep GitHub and AtomGit on
the same verified commit.

**Success Criteria**: The pull request and resulting main workflow pass; GitHub
and AtomGit read back the same main SHA.

**Tests**: Inspect PR checks, post-merge main run, and remote SHA read-backs.

**Status**: Not Started

## Stage 1: Exercise the portable CLI lifecycle
**Goal**: Add one focused regression that builds a verified CLI release, runs it offline through a stable `current` path, rejects a corrupted upgrade, switches versions atomically and uninstalls cleanly.
**Success Criteria**: Install, offline scan, corruption rejection, upgrade, rollback and uninstall are all asserted with the documented exit behavior.
**Tests**: `pnpm vitest run tests/cli-package.test.ts`
**Status**: Complete

## Stage 2: Document operator commands and recovery
**Goal**: Extend the CLI rehearsal guide with the exact lifecycle, failure, recovery, rollback and uninstall procedure.
**Success Criteria**: A clean host can follow the guide without relying on source-only state or an installer that does not exist.
**Tests**: Documentation integrity and manual command review.
**Status**: Complete

## Stage 3: Retain machine-readable evidence
**Goal**: Record the source baseline, host/tool versions, commands, result hashes and limits for the lifecycle rehearsal.
**Success Criteria**: Evidence distinguishes engineering verification from public beta publication and formal Issue #5 acceptance.
**Tests**: JSON parse and provenance checks in the full suite.
**Status**: Complete

## Stage 4: Run the project quality gate and deliver
**Goal**: Run the full project checks, update execution status, merge through a reviewed PR and synchronize GitHub with AtomGit.
**Success Criteria**: Required PR and main checks pass; both remotes resolve the same main SHA; Issue #5 records the evidence and remaining gates.
**Tests**: `pnpm check`; GitHub Actions; remote SHA read-back.
**Status**: In Progress

## Stage 1: Lockfile graph regression contract
**Goal**: Advance M1 issue #3 with npm v2/v3 graph fixtures and explicit uncertainty.
**Success Criteria**: Tests fail for missing graph behavior; root/transitive/scoped/alias/peer/missing/link cases specified. No independent accuracy claim.
**Tests**: npm hoisting, duplicate installed versions, shrinkwrap precedence, unsupported formats, malformed metadata, stale declarations, deterministic CLI/schema parity.
**Status**: Complete

## Stage 2: Bounded offline npm graph adapter
**Goal**: Parse package-lock/shrinkwrap metadata without network, install or source execution.
**Success Criteria**: Experimental report schema 0.2.0 includes deterministic nodes/edges; unsupported and missing resolution explicit; existing scan behavior preserved.
**Tests**: Full regression suite, credential redaction, malformed/traversal/symlink lockfiles, limited resources.
**Status**: Complete

## Stage 3: Verification and delivery
**Goal**: Update PR #12, scope documentation and issue #3 with tested implementation evidence.
**Success Criteria**: Frozen install, format/lint/types/tests/schema/parity, workflow lint and final-head GitHub matrix pass. Leave M1 open for pnpm/yarn, API/rules and acceptance.
**Tests**: Local pnpm check, built CLI npm fixture smoke, GitHub Actions Linux 22/24 and macOS 24.
**Status**: In Progress

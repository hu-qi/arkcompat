## Stage 1: pnpm v9 regression contract
**Goal**: Continue M1 issue #3 with root importer and snapshot graph tests.
**Success Criteria**: Test-first cases cover direct/transitive/scoped/alias/peer snapshots, unresolved/link/workspace cases, parser safety and deterministic output.
**Tests**: Authored fixtures, malformed YAML, duplicate keys, aliases/tags, missing snapshots and stale importers; preserve npm regressions.
**Status**: Complete

## Stage 2: Offline pnpm adapter and schema
**Goal**: Add bounded YAML parsing and v9 metadata graph through the shared core.
**Success Criteria**: Exact snapshot/peer identities preserved, uncertainty explicit, manager selection deterministic, schema 0.3.0 and no scanner network/package execution.
**Tests**: Full unit/schema/CLI parity checks; real pnpm-generated lockfile-only smoke; own-repo scan.
**Status**: Complete

## Stage 3: Verification and delivery
**Goal**: Update PR #12, reproduction docs and tracked issues with final-head CI evidence.
**Success Criteria**: Frozen install, lint/format/types, full test suite and GitHub matrix pass; remove this plan after completion; leave M1 open for remaining scope.
**Tests**: pnpm check, workflow lint, fixture CLI smoke and GitHub Linux 22/24 + macOS 24.
**Status**: In Progress

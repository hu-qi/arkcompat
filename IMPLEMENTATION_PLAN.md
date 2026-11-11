## Stage 1: Contract and failing regressions
**Goal**: Define the pnpm workspace module boundary and capture safe, stale and unsupported importer behavior in tests.
**Success Criteria**: New tests fail against the current root-only pnpm adapter and schema 0.9.0 contract.
**Tests**: Scoped importer graphs, workspace links, stale/missing/duplicate manifests, unsafe paths, symlinks, limits and CLI/Web/schema parity.
**Status**: Complete

## Stage 2: Bounded pnpm workspace inventory
**Goal**: Discover `pnpm-workspace.yaml` packages, validate importer/manifest correspondence and project each importer into a module-local graph.
**Success Criteria**: Supported workspaces produce `kind: "pnpm"` declarations and reachable direct/transitive edges; unsupported cases stay declarations-only.
**Tests**: Focused pnpm workspace tests plus existing npm/OHPM workspace regressions.
**Status**: Complete

## Stage 3: Evidence, integration and delivery
**Goal**: Update the strict contract and consumers, author the fixture/docs/evidence and validate through the full local and GitHub Actions gates.
**Success Criteria**: `pnpm check` passes, authoritative CI passes, and GitHub/GitCode/AtomGit read back the same merged SHA.
**Tests**: Full workspace tests, schema/CLI/Web parity, documentation integrity, packaging smoke and three-remote SHA read-back.
**Status**: In Progress

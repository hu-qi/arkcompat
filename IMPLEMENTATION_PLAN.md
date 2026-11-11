# Issue #3: Yarn workspace descriptor inventory

## Stage 1: Contract and negative fixtures

**Goal**: Freeze the Yarn workspace inventory contract and safe discovery boundaries.

**Success Criteria**: Workspace module output, manager-specific coverage, duplicate,
missing, stale and unsupported declarations are represented without accepting
unsafe paths or workspace protocols that cannot be linked to a reviewed local
manifest.

**Tests**: Classic and Berry workspace scans, malformed workspace declarations,
path traversal/symlink rejection, duplicate identity, missing lock descriptors,
deterministic schema/CLI parity, and absence of secret-bearing selectors.

**Status**: Complete

## Stage 2: Scoped graph implementation

**Goal**: Project module-local dependency graphs from the selected Yarn lock
without installing packages, executing lifecycle scripts or resolving arbitrary
ranges.

**Success Criteria**: Classic and Berry workspaces expose direct declarations,
exact recorded transitive edges and explicit unsupported/missing resolutions;
workspace paths never leave the repository.

**Tests**: Exact local and transitive edges, aliases, optional/dev/peer
classification, missing/stale descriptors, workspace protocol handling and
resource bounds.

**Status**: Complete

## Stage 3: Full quality and delivery evidence

**Goal**: Verify the integrated scanner and publish reproducible workspace
evidence.

**Success Criteria**: Full local checks, authoritative PR/main Actions jobs,
deterministic fixture report hashes, documentation, three-remote sync and clean
workspace.

**Tests**: `pnpm check`, CLI/schema parity, package/VSIX runtime parity, GitHub
Actions, remote SHA read-back.

**Status**: In Progress

# Issue #3: Bounded workspace globstar discovery

## Stage 1: Contract and regression fixtures

**Goal**: Define safe `**` behavior while preserving explicit rejection for
other unsupported glob syntax.

**Success Criteria**: Terminal and intermediate globstars select nested
manifests deterministically without crossing symlinks or excluded directories.

**Tests**: Zero/multiple depth, intermediate segments, non-manifest directories,
symlinks and unsupported brace patterns.

**Status**: Complete

## Stage 2: Shared bounded resolver

**Goal**: Add one shared resolver used by npm, pnpm and Yarn workspace adapters.

**Success Criteria**: Traversal stops at deterministic directory and workspace
limits; no outside target enters report paths.

**Tests**: Existing npm/pnpm/Yarn workspace suites plus globstar regressions.

**Status**: Complete

## Stage 3: Quality and delivery evidence

**Goal**: Verify full consumers, package parity, authoritative CI and mirror
delivery.

**Success Criteria**: `pnpm check`, PR/main Actions, evidence documentation,
three-remote SHA read-back and clean workspace.

**Tests**: Full suite, CLI/schema parity and packaged runtime parity.

**Status**: In Progress

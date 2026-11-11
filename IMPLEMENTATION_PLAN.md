# npm workspace inventory · Issue #3

## Stage 1: Contract and negative fixtures
**Goal**: Define explicit npm/OHPM module provenance and the safe workspace boundary before implementation.
**Success Criteria**: Tests describe workspace declarations, scoped lock projection, unsafe patterns, duplicate names, stale manifests and missing lock targets.
**Tests**: Failing workspace regressions plus strict schema/CLI/Web parity expectations.
**Status**: Complete

## Stage 2: Bounded workspace discovery and lock projection
**Goal**: Discover only safe in-tree workspace directories selected by package.json, read their manifests without following symlinks and project recorded npm lock edges.
**Success Criteria**: Registered manifests are parsed once, unrelated nested manifests remain limited, and no installation or compatibility conclusion is inferred.
**Tests**: npm v2/v3 positive and negative workspace fixtures, deterministic repeat scans and resource limits.
**Status**: Complete

## Stage 3: Contract migration and delivery evidence
**Goal**: Version the generalized module contract, update CLI/Web/VS Code consumers and document reproduction, limitations and rollback.
**Success Criteria**: Full local check passes and all three remotes can receive the verified final commit.
**Tests**: `pnpm check`, GitHub required jobs, merged-main CI and mirror SHA read-back.
**Status**: In Progress

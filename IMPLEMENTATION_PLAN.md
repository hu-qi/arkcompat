## Stage 1: Workspace and regression fixtures
**Goal**: Establish the #3 TypeScript workspace and test-first CLI/core contracts on top of PR #10.
**Success Criteria**: Pinned tooling, strict package boundaries, negative and deterministic scan fixtures fail before implementation.
**Tests**: Manifest validation, AST extraction, malformed input, local-only scanning, schema and CLI integration.
**Status**: Complete

## Stage 2: Offline scan vertical slice
**Goal**: Read direct dependency declarations and JS/TS module references; emit versioned JSON with explicit unknown classifications.
**Success Criteria**: Stable relative locations and IDs, explicit incomplete coverage, no lifecycle/network execution or unsupported compatibility claims.
**Tests**: Repeated scan equality, aliases/duplicates, dynamic imports, parse errors, symlinks, ignored directories, CLI errors and report schema.
**Status**: Complete

## Stage 3: Quality checks and reviewable delivery
**Goal**: Build/typecheck/lint/test/format in CI and document supported behavior and open M0 decisions.
**Success Criteria**: Local checks pass; stacked PR against PR #10 with actual CI evidence; #3 remains open for remaining graph/rules work.
**Tests**: Frozen install, full quality command, built CLI smoke and GitHub Actions checks.
**Status**: In Progress

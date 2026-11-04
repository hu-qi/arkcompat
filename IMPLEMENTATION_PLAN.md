## Stage 1: Yarn Classic regression contract
**Goal**: Continue M1 issue #3 with descriptor-based Yarn v1 graph cases.
**Success Criteria**: Failing tests specify grouped selectors, exact descriptor resolution, aliases, peers/missing/version conflicts, invalid/conflicted input and manager selection.
**Tests**: New Classic fixtures and existing npm/pnpm regressions; explicit Berry uncertainty.
**Status**: Complete

## Stage 2: Offline Yarn Classic adapter
**Goal**: Use the official Classic lockfile parser with bounded input and sanitized errors.
**Success Criteria**: Deterministic descriptor IDs, no inferred hoisting/peer installation, schema 0.4.0, safe exact-match references and local-only scans.
**Tests**: Schema/CLI parity, resource and privacy regressions; fixture and real Yarn-generated lockfile smoke.
**Status**: Complete

## Stage 3: Verification and delivery
**Goal**: Update PR #12, scope docs and issues with final-head evidence.
**Success Criteria**: Frozen install, full quality command and actual GitHub matrix pass; remove plan when done; M1 remains open for semantic/acceptance gaps.
**Tests**: pnpm check, workflow lint, built CLI smoke, Linux Node 22/24 and macOS Node 24 CI.
**Status**: In Progress

**CI regression (2026-11-04):** Run 41824055957 exposed slow legacy-parser failure on unterminated strings (two CLI tests exceeded 5 seconds on all runners). Add linear quote prevalidation and bounded child-process regression checks; retain the existing test timeout and all negative assertions.

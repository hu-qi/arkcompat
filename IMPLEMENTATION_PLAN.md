# v0.1.1 engineering preview patch · Issue #8 (M6), related #6/#11

Scope: release the merged F-01–F-04 fixes with accurate identity and claims. This does not satisfy the four accuracy metrics or KB acceptance (0/5). User authorized verification and platform publication on 2026-11-24. Existing disk-install/VSIX/GitHub channels are retained.

## Stage 1: Patch identity and release description
**Goal**: Bind all shipped component versions to 0.1.1 and prepare accurate release notes.
**Success Criteria**: Regression rejects inconsistent package/runtime/plugin identity; schemas stay versioned independently; pnpm check passes.
**Tests**: Release identity regression; existing package/version/Web/CLI tests; full pnpm check.
**Status**: Complete

## Stage 2: Candidate review and reproducible artifacts
**Goal**: Obtain review and green required CI, double-build all available artifacts from a clean commit, and exercise packaged entry points.
**Success Criteria**: Required PR/main jobs pass; per-host rebuild hashes match; verifier and available host smoke pass; unavailable hosts are explicit.
**Tests**: verify-release --smoke; SHA256SUMS comparison; CLI/MCP/Web/IDE observations; CI package jobs.
**Status**: In Progress

## Stage 3: Publish and verify platform read-backs
**Goal**: Publish the patch to authorized available release channels and synchronize code/tags.
**Success Criteria**: Published tag resolves to verified source; downloaded assets match checksums and pass smoke; GitHub/AtomGit/GitCode refs agree; remaining limitations documented.
**Tests**: Release API read-back; fresh downloads; verify-release; git ls-remote.
**Status**: Not Started

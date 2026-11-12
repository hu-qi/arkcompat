## Stage 1: Scanner execution and input boundaries
**Goal**: Prove and enforce that scans never execute project package scripts and fail explicitly for malformed, oversized, escaped, or special-file inputs.
**Success Criteria**: Negative tests cover lifecycle scripts, path escape, symlinks, special files, malformed lockfiles, and bounded reads; evidence records the exact behavior.
**Tests**: Focused scanner tests plus `pnpm check`.
**Status**: Complete

## Stage 2: CLI beta lifecycle
**Goal**: Make install, upgrade, offline execution, corrupt-input recovery, uninstall, and rollback reproducible from a clean directory.
**Success Criteria**: Packaging and clean-extraction rehearsal evidence includes exit codes, hashes, and recovery commands.
**Tests**: Portable CLI package verification and clean-host rehearsal.
**Status**: Not Started

## Stage 3: Report stability and security probes
**Goal**: Validate stable JSON, Markdown, and SARIF fields across repeated exports and complete security/resource probes.
**Success Criteria**: Schema checks, repeated hashes, surface-only differences, threat matrix, and no undisposed high-risk finding.
**Tests**: Focused report tests, negative probes, and `pnpm check`.
**Status**: Not Started

## Stage 4: Supply-chain audit
**Goal**: Produce dependency, SBOM, notice, license, and distribution evidence for Issue #7/#8.
**Success Criteria**: Audit, runtime provenance, third-party notices, SHA-256 inventory, and blocker disposition are retained.
**Tests**: `pnpm audit`, package generation, and `pnpm verify:runtime-provenance`.
**Status**: Not Started

## Stage 5: Evidence, review, and release closeout
**Goal**: Publish evidence to Issues, resolve feasible product gaps, complete formal acceptance and release gates, synchronize GitHub and AtomGit, and remove the temporary `TODO.md` only when all closure conditions are proven.
**Success Criteria**: Every open Issue is closed with evidence or an explicitly authorized deferral; formal release and handoff are complete.
**Tests**: Authoritative CI, remote SHA read-back, artifact verification, and acceptance audit.
**Status**: Not Started

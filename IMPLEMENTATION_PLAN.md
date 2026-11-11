## Stage 1: Contract and bounded range validation
**Goal**: Validate standard semver registry ranges against recorded lock versions in npm, pnpm, Yarn and OHPM graphs.
**Success Criteria**: Schema 0.12 exposes `mismatch`; exact targets remain visible; tags/protocols stay unchecked.
**Tests**: Positive and negative package-lock, pnpm, Classic, Berry, OHPM and workspace fixtures.
**Status**: Complete

## Stage 2: Consumer migration and documentation
**Goal**: Move CLI, Web, VS Code, schemas and current documentation to the new contract and resolution semantics.
**Success Criteria**: Strict consumers reject 0.11 reports and current docs describe semver-only scope and remaining uncertainty.
**Tests**: Web schema rejection, Ajv validation, documentation integrity.
**Status**: Complete

## Stage 3: Packaging and authoritative verification
**Goal**: Prove portable CLI/VSIX parity, runtime notices and SBOM behavior, then run protected CI before merge.
**Success Criteria**: Local checks pass; all five required GitHub Actions jobs pass for the PR and merged main.
**Tests**: `pnpm check`, package parity, runtime notice/SBOM checks, PR checks.
**Status**: In Progress

## Stage 1: Deterministic runtime inventory

**Goal**: Generate a CycloneDX 1.5 runtime dependency inventory from the actual
portable CLI tree without network or package execution.
**Success Criteria**: Components, license declarations, package metadata hashes
and dependency edges are canonical and contain no build-host paths.
**Tests**: Synthetic nested/scoped packages, duplicate copies, missing licenses
and deterministic repeat output.
**Status**: Complete

## Stage 2: Packaged CLI evidence

**Goal**: Attach the SBOM and SHA-256 file inventory to every portable CLI
rehearsal.
**Success Criteria**: `pnpm package:cli` emits `SBOM.cdx.json` and
`SHA256SUMS`; relocation and checksum checks pass.
**Tests**: Packaging regression compares the package inventory with runtime
components and verifies every checksum.
**Status**: Complete

## Stage 3: Documentation and delivery

**Goal**: Record the release-provenance boundary and authoritative delivery
evidence.
**Success Criteria**: Docs, local checks, PR/main Actions and three-remote SHA
read-backs pass.
**Tests**: `pnpm check`, CycloneDX schema validation and CLI artifact checks.
**Status**: In Progress

# M3-05 report stability implementation plan

## Stage 1: Add cross-surface regression
**Goal**: Bind canonical scan and assessment reports to their schemas and prove stable bytes across JSON, Markdown, SARIF, CLI and Web parsing.
**Success Criteria**: Repeated renderings are byte-identical; stable semantic fields agree; malformed report fields remain rejected.
**Tests**: New `tests/report-stability.test.ts` plus the existing report and web-viewer suites.
**Status**: Complete

## Stage 2: Produce retained evidence
**Goal**: Record hashes, schema validation and surface comparisons in a machine-readable evidence artifact.
**Success Criteria**: Evidence names input, toolchain, commands, output hashes and known limits without claiming formal accuracy.
**Tests**: Evidence JSON parses and its hashes match regenerated outputs.
**Status**: Complete

## Stage 3: Update the report contract documentation
**Goal**: Document canonical JSON semantics and Markdown/SARIF projections with the new evidence.
**Success Criteria**: Documentation integrity passes and links resolve.
**Tests**: `pnpm check` and `git diff --check`.
**Status**: Complete

## Stage 4: Merge and synchronize
**Goal**: Deliver M3-05 through a tracked Issue #5 pull request, verify main and synchronize AtomGit.
**Success Criteria**: All five required checks pass, the PR is merged, main passes, both remote main refs resolve to the merged SHA, and Issue #5 records the evidence and remaining gates.
**Tests**: GitHub PR/main runs and remote ref read-back.
**Status**: In Progress

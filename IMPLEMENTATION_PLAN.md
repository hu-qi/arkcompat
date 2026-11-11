## Stage 1: Shared sequence expansion
**Goal**: Replace the comma-only parser with a bounded standard brace expander.
**Success Criteria**: Adjacent, nested, numeric and alphabetic sequence patterns retain the 64-pattern cap and fail closed on malformed input.
**Tests**: Existing comma-list regressions plus npm numeric, alphabetic-step and descending sequences.
**Status**: Complete

## Stage 2: Host-compatible manager policy
**Goal**: Match npm, pnpm and Yarn behavior for the sequence forms each host actually expands.
**Success Criteria**: npm supports its padded and stepped sequences; pnpm/Yarn accept simple numeric and alphabetic ranges and disclose unsupported padded/stepped variants.
**Tests**: Manager-specific positive paths, excluded paths and limitation assertions.
**Status**: Complete

## Stage 3: Host and release verification
**Goal**: Verify against pinned host package managers, run the full repository checks, publish through CI and synchronize mirrors.
**Success Criteria**: npm 10.9.9, pnpm 10.34.9 and Yarn 4.0.0 probes agree with the manager policy; required GitHub checks pass; mirror SHAs match.
**Tests**: Temporary host probes, `pnpm check`, PR checks and merged-main checks.
**Status**: In Progress

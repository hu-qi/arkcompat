# Workspace character-glob implementation plan

## Stage 1: Regression contract

**Goal**: Define host-observed workspace selection behavior for segment wildcards,
single-character wildcards, positive character classes and negated character
classes across npm, pnpm and Yarn.
**Success Criteria**: New negative and positive tests fail against the current
implementation while retaining the existing fail-closed malformed-pattern cases.
**Tests**: npm, pnpm and Yarn integration fixtures plus a checked-in
machine-readable example.
**Status**: Complete

## Stage 2: Bounded matcher

**Goal**: Extend the shared workspace discovery matcher without changing
globstar, brace, exclusion, symlink or traversal limits.
**Success Criteria**: Exact regex construction from validated literal and glob
tokens; unsupported extglobs and malformed classes remain explicit limitations.
**Tests**: Determinism, no-match, unsupported-pattern, wildcard amplification and
existing workspace suites.
**Status**: In Progress

## Stage 3: Host and artifact evidence

**Goal**: Record npm, pnpm and Yarn host selections and source/portable/VSIX
report parity.
**Success Criteria**: Host outputs match the parser, artifact reports have
identical bytes and all mandatory GitHub checks pass.
**Tests**: `pnpm check`, package/relocation/VSIX smoke and authoritative Actions.
**Status**: Not Started

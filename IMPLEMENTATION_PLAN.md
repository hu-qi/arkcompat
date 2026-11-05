## Stage 1: Source call regression contract
**Goal**: Advance M1 issue #3 from module references to symbol-aware imported API call inventory.
**Success Criteria**: Tests first cover named/default/namespace imports, CommonJS require, shadowing, dynamic/type-only inputs and deterministic locations.
**Tests**: Calls/constructors, alias/shadow false positives, mutable require bindings, unsupported member/dataflow forms, schema and CLI parity.
**Status**: Complete

## Stage 2: Offline source analyzer
**Goal**: Extract module references, immutable bindings and API access paths through the existing TypeScript Compiler API.
**Success Criteria**: Experimental schema 0.5.0, explicit uncertainty for unsupported patterns, no guessed compatibility/rules, existing graph behavior preserved.
**Tests**: Full regressions, source diagnostics/privacy, documented fixture and CLI smoke.
**Status**: Complete

## Stage 3: Delivery and mirror verification
**Goal**: Deliver reviewed/tested code through a GitHub PR and synchronize verified main to AtomGit over HTTPS.
**Success Criteria**: Frozen install and all quality checks pass, PR/main CI pass, GitHub and AtomGit main SHAs match without force push; remove completed plan.
**Tests**: GitHub Linux 22/24 + macOS 24, post-merge main run, local/remote SHA and clean working tree checks.
**Status**: In Progress

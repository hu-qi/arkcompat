# Product Requirements Document · ArkCompat

**Status:** Draft v0.1 / 2026-11-02. **Acceptance:** 2026-12-23. **Owner/approver:** TBD.

## 1. Problem and value

Frontend and cross-platform developers cannot reliably establish whether NPM packages, Node.js APIs, browser APIs, native modules and networking/crypto/storage dependencies can run in a specified HarmonyOS environment. Manual compatibility searches are labor-intensive, not reproducible and rarely include migration evidence.

ArkCompat scans **dependencies and source usage**, correlates the results with a versioned HarmonyOS compatibility matrix and NPM↔OHPM replacement knowledge base, classifies known incompatibilities and unknown risks, and produces actionable migration evidence.

## 2. Personas and jobs-to-be-done

- **Migrating developer:** scan an existing project; identify exact incompatible calls, source positions and feasible workarounds.
- **Library porter:** find high-impact absent HarmonyOS adaptations; prioritize supported work items using usage evidence, not speculative popularity.
- **Maintainer/CI owner:** detect new compatibility regressions after dependency upgrades and compare machine-readable reports.
- **AI coding agent:** use MCP to inspect trusted compatibility facts, not hallucinate package equivalence.

## 3. Required product capabilities

**R1 Dependency scan:** Parse manifest and lockfiles; record direct/transitive nodes, aliases, workspace packages, versions, import resolution, and unresolved declarations. Cover npm, pnpm, yarn; research OHPM-specific metadata early. Detect dynamic or conditional dependencies as uncertain where evidence is insufficient.

**R2 Source/API analysis:** Extract JS/TS imports, calls and static property access with symbol-aware matching where practical; detect Node, browser, native-module and selected cryptography/network/storage APIs. Account for runtime target, target OS/API Level and version conditions. Unsupported syntax/features must be diagnosed rather than silently skipped.

**R3 Compatibility classification:** Produce one of verified-compatible / verified-incompatible / conditional / potential-risk / unknown / not-applicable; record evidence tier (static/rule, build, runtime). Avoid inferring incompatible merely from missing a same-named OHPM package.

**R4 Replacement advice:** Return validated NPM↔OHPM equivalence with compatibility scope (full/partial), input and target version ranges, environment, API coverage, evidence URL and verification status; provide "no verified substitute" without guessing.

**R5 Missing library assessment:** Distinguish no OHPM publication, known port/Fork, pure JS needing no dedicated port, and genuinely unconfirmed support. Optional source: Harmony Connect Issues after license and API review.

**R6 Reports:** Stable JSON schema first; human-readable Markdown/SARIF/HTML adapters. Show location, risk, cause, recommended action, references, rule/knowledge snapshot IDs and reproducibility metadata.

**R7 Multi-surface:** Same scan contract for CLI, VS Code/Cursor, DevEco Studio integration, Web report interface, MCP and CI. Clients may add UX but not divergent compatibility adjudication.

**R8 AI assistance:** Explain evidence, propose migration steps and draft potential porting work; AI cannot change a verified result without independently verified evidence. User controls privacy and remote model submission.

## 4. Out of scope for first acceptance unless separately approved

Automatic production code rewrite and guaranteed compilation; automatic GitCode issue submission; real-time cloud execution of untrusted uploaded repositories; all frameworks or all devices as fully verified targets; general-purpose security static-analysis tooling.

## 5. Input / output example contract (illustrative)

Input: local project path + runtime profile (ArkTS, ArkWeb, cross-platform adapter) + HarmonyOS target release/API level + lockfile strategy + network/privacy policy.

Output: scan metadata, dependency graph summary, findings with diagnostic keys, verified replacement candidates, unsupported/unknown list, missing-library classification, metrics/traces.

Do not equate **source scanned** with **code verified running on a device**.

## 6. User journeys

1. Developer executes one scan, receives a reproducible report and can jump to the exact file/line.
2. Developer opens a finding, sees how it was detected, scope, confidence/evidence and candidate substitutes.
3. Developer accepts or dismisses advice with audit trail (local, no default telemetry).
4. CI compares baseline to current scan and flags new high-confidence regressions.
5. Maintainer exports curated replacement mappings and reviews invalid/outdated entries.

## 7. Definition of release completion

- All original acceptance metrics independently calculated and documented; see [QUALITY-GATES](QUALITY-GATES.md).
- Installation and example usage succeed for each surface claimed delivered.
- Zero known critical defects in parsing/classification/privacy.
- Reports trace claims to verifiable evidence; no unverified AI claims are presented as facts.
- Unimplemented targets and unsupported cases clearly listed.

## 8. Dependencies / open decisions

Availability of official reference samples, applicable API release mapping, DevEco third-party plugin mechanism, validated package registry/port metadata, evaluator sign-off and development staffing. Track in [DECISIONS](DECISIONS.md) and [ROADMAP](../ROADMAP.md).

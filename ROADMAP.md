# ArkCompat Roadmap

> Version: draft 0.1 · drafted 2026-11-02 · first acceptance deadline: **2026-12-23**.
>
> **Status legend:** ◻ planned · ▶ active · ✓ verified · ⛔ blocked. All milestones below are **proposed delivery targets**, not completed work or commitments by Huawei.

## Product direction

One TypeScript-first, evidence-based compatibility analysis engine serving **CLI, VS Code/Cursor, DevEco Studio, Web, MCP/AI agents and CI/CD**. Share rules, report schema and knowledge base across all entry points; never implement independent compatibility logic in clients.

**Success is quality, not the number of demos.** No entry point may claim "supported" without smoke tests, versioned artifacts and parity checks. If implementation risk exceeds the deadline, raise an explicit scope/acceptance decision rather than silently relaxing verification.

## First release milestones

| Milestone | Dates (2026) | Deliverables | Exit gate |
|---|---|---|---|
| [**M0 · Charter & feasibility**](https://github.com/hu-qi/arkcompat/issues/1) ◻ | Nov 2–6 | PRD, ADRs, threat model, benchmark methodology, **day-one GitHub Actions + gh CLI checks**, dependency/DevEco plugin spikes, legacy PR #2 audit | Boundaries and disputed acceptance definitions documented; unknowns have owners; DevEco plugin feasibility recorded |
| [**M1 · Deterministic scanning**](https://github.com/hu-qi/arkcompat/issues/3) ◻ | Nov 7–16 | TypeScript workspace, dependency graph (direct/transitive), JS/TS AST analysis, version-aware rules, CLI JSON output | Fixtures cover multiple lockfiles and API import alias cases; errors reported as unknown instead of false compatible |
| [**M2 · Knowledge & evaluation**](https://github.com/hu-qi/arkcompat/issues/4) ◻ | Nov 17–27 | Curated NPM↔OHPM mapping, provenance/version fields, missing-library classification, labeled independent benchmark | Reproducible scores, baseline and error analysis; source and label provenance recorded |
| [**M3 · Advice & reports**](https://github.com/hu-qi/arkcompat/issues/5) ◻ | Nov 28–Dec 6 | Explainable migration guidance, AI assist with evidence-only constraints, Markdown/JSON/SARIF, CLI beta | Every finding traceable to location, rule/data version and evidence; CI regression dataset frozen |
| [**M4 · Multi-entry delivery**](https://github.com/hu-qi/arkcompat/issues/6) ◻ | Dec 7–14 | VS Code/Cursor extension, DevEco plugin adapter (subject to feasibility), Web report viewer, MCP server, CI action | Each entry point can scan same fixture and yields semantically equivalent results; install/run smoke tests |
| [**M5 · Release candidate**](https://github.com/hu-qi/arkcompat/issues/7) ◻ | Dec 15–19 | Integration tests, privacy/security review, packaging, performance baseline, independent acceptance rehearsal | Quality gates pass with independent holdout set; no unresolved blocking defects |
| [**M6 · 2026-12-23 acceptance**](https://github.com/hu-qi/arkcompat/issues/8) ◻ | Dec 20–23 | Release artifacts, documentation, demo/reproduction scripts, benchmark evidence, handover | Reproducible installation, metrics and sign-off record; no unsupported acceptance claims |

**Critical path**: trustworthy reference data → deterministic classification → independent benchmark → consistent multi-entry integration → delivery verification.

## Engineering progress · 2026-11-05

The [delivery register](docs/DELIVERY-STATUS.md) tracks every current Issue's verified implementation, next engineering action and closure boundary. Legacy audit #9 is closed with a no-import decision; reports and knowledge metadata are engineering increments, while runtime/acceptance/DevEco/license decisions and remaining product work stay explicit. This does not mark any milestone exit gate complete.

Issue #3 now has an experimental [offline inventory slice](docs/SCANNER-SLICE.md): TypeScript workspace, direct declarations, AST module references, strict JSON schema, CLI and regression/parity tests. This is partial M1 implementation, not an exit-gate pass. npm v2/v3 metadata graphs now add direct/transitive edges, hoisting and unresolved/link limitations ([scope](docs/NPM-LOCKFILES.md)). pnpm v9 root importer/snapshot graphs now retain peer contexts, alias identity and explicit missing/link cases ([scope](docs/PNPM-LOCKFILES.md)). Yarn Classic v1 now adds exact descriptor graphs, grouped selector expansion and explicit peer/hoisting limits ([scope](docs/YARN-LOCKFILES.md)). [Berry v8](docs/YARN-BERRY-LOCKFILES.md) now has a partial root registry descriptor adapter with schema0.6 parity; other Berry versions, full workspace/older pnpm graphs, compatibility rules, knowledge and independent accuracy remain pending; M0 decisions remain open; planning #10 and inventory #12 are merged. Source inventory now adds lexical-symbol-aware import/require calls, constructors and type references ([scope](docs/SOURCE-API-INVENTORY.md)), while all compatibility findings remain unknown.

## Acceptance mapping (do not change the original targets)

1. **Dependency scan correctness ≥80%**; define denominator and report precision/recall for direct/transitive dependencies separately.
2. **Correctness of recommended HarmonyOS substitutes =100%** on the agreed acceptance set; a recommendation requires documented feature/version/environment evidence. "Unknown/no confirmed substitute" is allowed but reported as a separate coverage metric, not a way to hide misses.
3. **Incompatible API detection ≥80%** for HarmonyOS **6.0.0+**, with target API Level, runtime and permission/feature constraints in each result. Report false-positive rate independently.
4. **Missing HarmonyOS-version library identification ≥80%** on labeled samples; absence of same-named OHPM package is **not** proof of an absent port.
5. **Deliver the replacement-relationship knowledge base**, with version ranges, origin/evidence URLs, confidence/verification tier, update date, and export.

The precise scoring functions, sample composition, tolerance and Huawei adjudication are pending decision; see [QUALITY-GATES](docs/QUALITY-GATES.md).

**CI quality gate:** [M0 GitHub Actions + gh CLI Issue #11](https://github.com/hu-qi/arkcompat/issues/11); [strategy](docs/CI-STRATEGY.md). Initial docs/workflow checks are not substitutes for independent scanner accuracy evaluation.

**Critical parallel tasks:** [DevEco plugin SDK feasibility spike](https://github.com/hu-qi/arkcompat/issues/2) (M0) and [legacy PR #2 audit](https://github.com/hu-qi/arkcompat/issues/9) (M0/M1).

## Cross-cutting workstreams

- **Rules/data:** compatibility matrix, NPM/OHPM mappings, versioning, source provenance, reproducible snapshots.
- **Scanner:** manifest/lockfile graph, AST + symbol resolution, runtime context, native-module heuristics.
- **Experience:** one stable scanner contract reused by CLI, IDE, Web, MCP and CI.
- **Verification:** golden fixtures, independently labeled holdout, build/runtime checks when available, security/privacy, performance.
- **Ecosystem:** evaluate Harmony Connect Issues as an optional source; no assumption of public API, license, or status semantics.

## Release policy / scope control

- **P0 (acceptance):** dependency and API scanning, defensible compatibility classification, substitute/missing identification, knowledge base and structured report, acceptance evidence.
- **P1 (desired entry points):** CLI + IDE + Web + MCP + CI integrations, all through the common API. The deadline applies only to an entry point whose technical feasibility and testing gates are met; unresolved feasibility must be escalated early.
- **P2 (after acceptance):** automatic code transformations, automatic issue submission, broad framework-specific emulation, cloud-scale operation.

## After the first acceptance

- **2027 Q1 / v0.2:** expand curated library coverage, trace-based runtime verification, DevEco & CI hardening, real-world feedback loop.
- **2027 Q2 / v0.5:** framework adapters (React Native / others) chosen by measurable usage demand; incremental scanning and privacy-preserving collaboration.
- **v1.0 (date TBD):** supported deployment matrix, long-term schema compatibility, independent benchmark governance, versioned data updates and sustainable maintainership.

## Governance and cadence

- Weekly Monday: milestone status, metric delta, blockers and dependency owners.
- Each PR: reference an Issue, include test evidence and rule/data provenance; code + evidence reviewed independently for new compatibility claims.
- Friday: checkpoint against exit gate, explicitly record pass/fail and replan.
- Keep every milestone tagged planned/active/verified/blocked, never equate a merged PR with a completed acceptance gate.

## Open decisions requiring Huawei input

See [docs/DECISIONS.md](docs/DECISIONS.md) for precise questions: runtime/target platform matrix, access to validated compatibility cases, 100% replacement judgment, DevEco extension distribution, official data reuse, and acceptance sign-off.

## Prior art / reuse gate

Legacy implementation: [ohpm-npm-compat-assistant PR #2](https://github.com/hu-qi/ohpm-npm-compat-assistant/pull/2). It reports passing local self-labeled fixtures, **not** independent accuracy. No automatic merge, copy or metric transfer without licensing, data and code review described in [docs/LEGACY-AUDIT.md](docs/LEGACY-AUDIT.md).

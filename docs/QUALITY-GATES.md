# Quality and Acceptance Plan · ArkCompat

**Status:** Proposed evaluation methodology, pending Huawei agreement. Initial delivery **2026-12-23**.

## Official requirements (preserve wording/threshold)

1. Project dependency scanning correctness **≥80%**; correctness of identified HarmonyOS replacement libraries **100%**.
2. Incompatible API identification **≥80%**, covering HarmonyOS **6.0.0+** APIs.
3. Missing HarmonyOS version/port detection **≥80%**.
4. Deliver a third-party library replacement-relationship knowledge base.

**Important:** "correctness" and "identification rate" are not automatically equivalent to precision/recall/accuracy. The acceptance formulas, denominator and target platform must be signed off; the matrix below is a proposed implementation.

## Proposed evaluation matrix

| Requirement | Unit of judgment | Suggested primary measure | Guardrail / evidence |
|---|---|---|---|
| Dependency scan ≥80% | (project, resolved package, version, edge type) | exact-match F1 (plus precision/recall) | Separate direct/transitive and lockfile subsets; no skipped parse errors |
| Replacement recognition 100% | (source package+version+runtime, recommended target+version) | precision = correct recommendations / all confident recommendations | Report abstention rate, eligible coverage and evidence tier; evaluator defines correct partial substitutions |
| Incompatible API identification ≥80% | (runtime profile, API usage site, rule, target version) | recall = TP/(TP+FN) | Report precision, false-positive count/rate, per-category recall |
| Missing port ≥80% | (source package/version, compatibility status, date snapshot) | recall on independently validated missing cases | Separate published OHPM, GitCode port, pure-JS direct use and unknown |
| Knowledge base | verified mapping record | schema validity + source traceability + updateability | Export JSON with source URL and version range; human review for confident mappings |

## Benchmark protocol

1. **Fixture pools**: at least npm/pnpm/yarn; direct/transitive; scoped aliases/workspaces; imports vs calls vs dynamic resolution; Node/browser/native/crypto/network/storage; ArkTS vs ArkWeb distinctions; SDK/version/permission differences.
2. **Source split**: developer fixtures are useful for local regression, but they are NOT sufficient as evidence for performance. Maintain independently labeled holdout sets from real repos and Huawei-adjudicated cases where permissible.
3. **Leak prevention**: freeze holdout and rule/data snapshot IDs; no AI access to hidden labels during recommendation; track any annotation corrections.
4. **Labels**: each sample identifies target runtime/release, expected classification, supporting document/verification, label author and adjudicator.
5. **Scoring**: provide per-category TP/FP/FN, macro/micro totals, confidence interval when sample sizes permit, skipped/unresolved cases and complete reproduction commands.
6. **Version scope**: use actual SDK/toolchain to validate mapping from OS 6.0.0+ to API Level; do not hardcode unverified compatibility claims.
7. **Failure classification**: parser bug, missing rule, stale ecosystem data, context ambiguity, wrong recommendation, unknown, flaky environment.

## Required gates

**G0 · Documentation**: decision owners, scoped profiles, accepted measures, baseline datasets, DevEco feasibility spike.

**G1 · CI correctness**: build, lint, typecheck, unit and fixture tests green. No fixture added solely to make failing metrics disappear.

**G2 · Scan correctness**: original threshold metrics reproducible, independently measured, grouped by environment; every unsupported case visibly flagged.

**G3 · Recommendation safety**: **zero false confident substitutions** in agreed acceptance cases; a missing substitute must return unknown/no confirmed substitute. Do not game precision through widespread abstention; disclose coverage.

**G4 · Surface parity**: exact same pinned core/rules/knowledge versions yield equivalent classified findings in CLI, IDE, Web, MCP and CI; each delivered surface has install/smoke tests.

**G5 · Security**: no default repository upload, no unconsented external AI transfer, secrets excluded from reports, untrusted package scripts not executed, resource/time limits set.

**G6 · Release candidate**: reproducible packaging and installation, functional demonstration on real projects, docs, known limitations, evidence bundle and sign-off.

## Sample evidence bundle

```text
evidence/
  manifest.json             # git sha, run ID, SDK, versions, snapshot hashes
  benchmark-results.json    # confusion matrix & category breakdown
  benchmark-results.md      # human-readable interpretation
  fixtures-index.json       # licenses, labels, source links
  compatibility-report.json # stable scanner output
  parity-report.json        # entrypoint parity
  security-review.md        # data flow & known limitations
  acceptance-signoff.md     # reviewer, decisions, waivers
```

## Red lines

Do not represent 100% against self-authored fixtures as real-world 100%. Do not mark static suspicion as runtime incompatibility. Do not fabricate source URLs, library matches, SDK support or test results. Do not silently adjust denominators or hide failed/skipped scans.

## Outstanding adjudications

- Denominator/metric for "dependency scanning correctness" and "incompatible API identification rate".
- Whether partial feature equivalence is accepted as a replacement.
- What qualifies as "missing HarmonyOS version": registry absence, lack of Fork, build failure or unverified status.
- Baseline SDK/API Level per HarmonyOS version and device/runtime scope.
- Ownership and deadlines for independent benchmark labels; minimum sample size, result format and review process.
- Whether each multi-surface entrypoint is explicitly required by 2026-12-23, or only by longer-term product roadmap.

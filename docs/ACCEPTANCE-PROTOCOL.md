# Acceptance Protocol Candidate · ArkCompat (Stage 1 / Issue #1)

**Status:** Candidate proposal drafted 2026-11-12 for owner and independent adjudicator sign-off. Not yet approved; engineering defaults do not replace formal adjudication under [DECISIONS](DECISIONS.md) (`D-02`, `D-03`, `D-04`) and [QUALITY-GATES](QUALITY-GATES.md).

## 1. Confirmed Thresholds vs. Pending Formal Definitions

The project owner confirmed MIT licensing for original ArkCompat contributions and preserved the five original acceptance thresholds on 2026-11-07:

| # | Original Requirement | Confirmed Threshold | Candidate Unit of Judgment | Candidate Primary Metric & Formula | Guardrails / Disclosed Denominators |
|---|---|---|---|---|---|
| 1 | Project dependency scan correctness | **≥ 80%** | `(projectId, modulePath, section, resolvedPackage, resolvedVersion, edgeKind)` | Micro-averaged exact-match **F1** across direct and recorded transitive nodes (`2 * TP / (2 * TP + FP + FN)`) | Report **precision**, **recall**, direct-only vs. transitive-only subsets, `mismatch` vs. `missing` vs. `unsupported` counts, and full denominator (`labeled`). Unparsed lockfiles count as misses rather than skipped. |
| 2 | Correctness of identified HarmonyOS replacement libraries | **100%** | `(sourcePackage, sourceVersion, targetProfile, recommendedTarget, targetVersionRange)` | **Precision** over confident recommendations (`TP / (TP + FP)` where `FP = wrong or false-confident recommendation`) | **Zero false-confident substitutions** (`FP = 0`). Zero-recommendation / 100%-abstention (`TP + FP = 0`) yields `precision: null` and **FAILS** acceptance: candidate minimum confident coverage floor **≥ 50%** on eligible benchmark cases with documented abstention rate (`abstained / labeled`). |
| 3 | Incompatible API identification (HarmonyOS 6.0.0+ / API 20+) | **≥ 80%** | `(filePath, line, column, runtimeProfile, targetApiLevel, module, apiPath, callKind)` | **Recall** (`TP / (TP + FN)`) on independently labeled incompatible API sites for `HarmonyOS >= 6.0.0` (`apiLevel >= 20`) | Report **precision**, **false-positive count & rate** (`FP / negative`), per-category recall (Node built-ins, Web DOM, native/FFI, crypto/network/storage), and abstention (`unknown`) rate separately. |
| 4 | Missing HarmonyOS version/port identification | **≥ 80%** | `(sourcePackage, sourceVersion, targetProfile, snapshotDate, availabilityClass)` | **Recall** on independently validated `missing-port` cases (`TP_missing / positive_missing`) | Must classify into the 5-way taxonomy (`ohpm-release`, `gitcode-port`, `pure-js`, `missing-port`, `unknown`). Inferring `missing-port` solely from absence of an identically named OHPM package is **invalid** and counted as `FP` if a GitCode port or pure-JS usage exists. |
| 5 | Replacement relationship knowledge base delivery | **Delivered & verifiable** | Validated `KnowledgeRecord` in canonical exported JSON snapshot | Schema validity + 100% source provenance (`url`, `license`, `sourceVersion`, `retrievedAt`) + review attribution + deterministic SHA-256 export | No unreviewed (`candidate`), expired (`asOf >= validUntil`), or license-unverified entries may emit confident recommendations in default mode. |

## 2. Partial-Equivalence & Abstention Policy (A2)

To prevent `100%` replacement correctness from being gamed either by over-broad claims or by blanket `unknown` abstention:

1. **Partial substitution (`relation: "partial"`) eligibility**: A partial replacement is scored **correct (`TP`)** if and only if:
   - Its `features.included` and `features.excluded` arrays explicitly cover/exclude the benchmark case's required capability scope;
   - The record carries `review.state: "reviewed"`, non-empty verified `provenance`, matching `profile.runtime` and `profile.apiLevel`, and `asOf < validUntil`;
   - Calling code receives explicit exclusion caveats (no "drop-in replacement" claim).
2. **Partial substitution failure (`FP`)**: A confident recommendation that omits a required feature in `features.excluded`, misstates `apiLevel` / `runtime` applicability, or matches a non-drop-in target as `relation: "full"` is scored as **`FP`** (failing the `100%` gate).
3. **Abstention (`unknown`)**: Returning `unknown` on a positive case counts as **`FN`** in recall/coverage and **`abstainedPositive`**; returning `unknown` on a negative case counts as **`abstainedNegative`** (never `TN` and never `TP`).
4. **Non-vacuous coverage rule**: If `TP + FP = 0`, `precision` is `null` (never `100%`). Acceptance requires both `precision === 1.0` (`FP === 0`) **and** non-zero eligible coverage agreed by the adjudicator (candidate proposal: `coverage >= 0.50` on curated benchmark items with documented runtime evidence).

## 3. Missing-Port Adjudication Criteria (A3)

Every assessed NPM package at a pinned version and target profile must map to exactly one availability state:

| Availability Class | Required Evidence Before Assignment | Compatible Substitute Emitted? |
|---|---|---|
| `ohpm-release` | Verified `ohpm` registry capture (`repo.harmonyos.com/ohpm/...`) with integrity hash, compatible license, matching runtime/API evidence, and reviewer sign-off | Yes (if `relation` is `full` or scoped `partial`) |
| `gitcode-port` | Verified public port repository (AtomGit/GitCode URL, commit/tag, build/runtime scope, license) without OHPM release | Yes (scoped to verified port provenance and build caveats) |
| `pure-js` | Verified zero-native/zero-Node-builtin/zero-DOM pure ECMAScript execution on the target runtime (`arkts` / `arkweb`) within ECMAScript standard constraints | No dedicated port needed (`not-applicable` / `pure-js` guidance) |
| `missing-port` | Checked OHPM registry, known ecosystem port registries (e.g., AtomGit/OpenHarmony TPC/Harmony Connect), and pure-JS blockers (native/N-API, missing built-ins, DOM dependency on `arkts`) with dated negative search record | No (`no verified substitute`; prioritized porting candidate) |
| `unknown` | Insufficient provenance, stale snapshot, ambiguous multiple matches, unreviewed `candidate` record, or unverified dynamic/native behavior | No (`abstain`) |

## 4. Independent Labels, Blind Isolation & Sign-Off Boundary (A5 / A8)

- **Self-authored developer fixtures** under `fixtures/developer/` are regression tests only and **never** enter acceptance denominators.
- **Holdout dataset governance**: Independent label author, non-author reviewer, and final adjudicator must be explicitly named in [DECISIONS](DECISIONS.md) (`D-02`). Predictions must be generated through label-blind adapters (`@arkcompat/evaluation`) where expected labels and adjudicator notes are absent from scanner/prediction inputs.
- **Revision rule**: If a formal evaluation fails, root causes are fixed in code or submitted to the adjudicator as a documented data-dispute; original failed runs are retained with SHA-256 hashes, and denominators are never silently edited.

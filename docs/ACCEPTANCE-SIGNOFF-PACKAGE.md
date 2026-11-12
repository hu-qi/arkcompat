# Acceptance and Release Sign-Off Package · ArkCompat

**Status:** Ready for owner and independent adjudicator review.
**Prepared:** 2026-11-12.
**Current main commit:** `4a6de52dea4647dda60bb0253a1085548748e0a8`.
**Current main checks:** [43204842537](https://github.com/hu-qi/arkcompat/actions/runs/43204842537).
**Engineering regression baseline:** `511790bcdac6f19bbc0dc53089336c16aeae9896`.
**Purpose:** Turn the remaining human decisions into one reviewable record that
unlocks the formal evaluation and release sequence.

This package does not approve a candidate, declare an accuracy result, close an
Issue or authorize publication. The engineering defaults remain proposals until
the named decision maker signs the corresponding section. Detailed rules remain
in [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md),
[TARGET-MATRIX](TARGET-MATRIX.md),
[HOLDOUT-ISOLATION](HOLDOUT-ISOLATION.md), [DECISIONS](DECISIONS.md) and
[QUALITY-GATES](QUALITY-GATES.md).

## 1. Current Engineering Baseline

| Item | Current verified state |
|---|---|
| License for original code | MIT, confirmed by project requester |
| Minimum target | HarmonyOS 6.0.0 / API 20 and later |
| Current main commit | `4a6de52dea4647dda60bb0253a1085548748e0a8` on GitHub and AtomGit; [main checks](https://github.com/hu-qi/arkcompat/actions/runs/43204842537) passed all five required jobs |
| Execution entry | [TODO](../TODO.md) is the permanent single execution entry and is not deleted after release |
| Engineering regression commit | `511790bcdac6f19bbc0dc53089336c16aeae9896` |
| Regression-baseline checks | [43202341237](https://github.com/hu-qi/arkcompat/actions/runs/43202341237), all five required jobs passed |
| Regression suite | 574 tests across 35 files at `511790b` |
| Core coverage | statements 94.82%, branches 92.62%, functions 98.11%, lines 96.74% |
| Assessment pipeline | scan → rules → knowledge → five-way classification → next action |
| Prediction adapters | five label-blind scopes implemented and hash-bound |
| Curated knowledge | six public-source candidates; zero reviewed; zero confident recommendations |
| Lottie candidate | local, inactive and uncommitted; SHA-256 `cfdea420d8d96d3ed49602a4354c8ed08dd042e15503792862cac5617f85caee` |

The CI result is engineering evidence. It does not establish independent
accuracy, runtime support, legal clearance or release readiness.

## 2. Decision Register

Each row needs one explicit outcome: **approve as written**, **approve with
amendments**, **reject**, or **defer with owner and due date**. A decision is
complete only when the decision maker, date, rationale, evidence and revisit
trigger are recorded.

| ID | Decision needed | Engineering proposal | Unlocks | Accountable decision maker | Outcome / date |
|---|---|---|---|---|---|
| S-01 | v1 target matrix | Phone ArkTS and ArkWeb on HarmonyOS 6.0.0 / API 20; add higher API profiles only after runtime evidence. Defer React Native and non-phone form factors unless explicitly brought into scope. | #1, #3, #6, #7 | Project owner and final adjudicator | Pending |
| S-02 | v1 delivery surfaces | Commit to CLI, VS Code/Cursor, DevEco disk-install ZIP, local Web, local MCP and CI adapter. Treat Marketplace/trustlist publication as a separate release route. Defer Remote AI from v1. | #1, #5, #6, #8 | Project owner | Pending |
| S-03 | Formal judgment units | Use the four candidate units and formulas in [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md): exact dependency-edge F1; replacement precision with non-vacuous coverage; incompatible-API recall; missing-port recall. | #1, #4, #7 | Project owner and final adjudicator | Pending |
| S-04 | Replacement equivalence | Count partial replacements only when included/excluded features and runtime/API scope are explicit. Require zero false confident recommendations and non-empty eligible coverage. | #1, #4, #7 | Project owner and final adjudicator | Pending |
| S-05 | Missing-port taxonomy | Approve `ohpm-release`, `gitcode-port`, `pure-js`, `missing-port` and `unknown`; registry absence alone never proves a missing port. | #1, #3, #4, #7 | Final adjudicator | Pending |
| S-06 | Independent roles | Name the label provider, non-author reviewer, final adjudicator and dispute resolver. State conflicts of interest and access boundaries. | #1, #4, #7 | Project owner | Pending |
| S-07 | Holdout governance | Approve dataset source, license, hash freeze, blind access, failed-run retention and correction process under [HOLDOUT-ISOLATION](HOLDOUT-ISOLATION.md). | #4, #7, #11 | Label provider, reviewer and owner | Pending |
| S-08 | Lottie disposition | Keep the private Canvas candidate inactive until API 20 runtime, signed Release/AOT device, stress/leak and complex-animation evidence are available; then perform a scoped independent review. | #4, #7 | Project owner after independent review | Pending |
| S-09 | Legal and dependency disposition | Record external data/trademark terms, resolve or formally accept the `@yarnpkg/lockfile@1.1.0` notice gap, and approve SBOM/notice output for distribution. | #6, #7, #8 | Owner and legal/security reviewer | Pending |
| S-10 | Release authorization | Approve the tag, signing/checksum route, publication channels, rollback owner and final acceptance package after all preceding gates pass. | #8 | Project owner and acceptor | Pending |

## 3. Freeze Record to Complete Before Formal Evaluation

The evaluator fills this record from immutable inputs. The project owner or
adjudicator signs only after checking every value against the retained files.

```text
Acceptance run ID:
Code commit:
Rules snapshot ID / SHA-256:
Knowledge snapshot ID / SHA-256:
Cases manifest SHA-256:
Labels manifest SHA-256:
Dataset license / access boundary:
Label provider:
Non-author reviewer:
Final adjudicator:
Target profile IDs:
SDK versions:
Runtime / device IDs:
Build modes:
Toolchain versions:
Evaluation command:
Evidence directory:
Failed-run directory:
Decision maker / date:
Revisit trigger:
```

Private labels and credentials stay in the authorized evaluation environment.
The public repository receives hashes, provenance, commands, aggregate results
and the signed decision record only.

## 4. Formal Acceptance Results

No row can be marked passed until a frozen independent run supplies the complete
denominator and the adjudicator signs the result.

| Requirement | Threshold | Required result fields | Current status | Signed result |
|---|---:|---|---|---|
| Dependency scan correctness | ≥ 80% | TP/FP/FN, precision, recall, exact-match F1, direct/transitive subsets | Not adjudicated | Pending |
| Confident replacement identification | 100% | TP/FP, precision, confident coverage, abstentions, partial-feature errors | Not adjudicated; zero confident recommendations | Pending |
| Incompatible API identification | ≥ 80% | TP/FP/FN, recall, precision, per-category and per-profile breakdown | Not adjudicated | Pending |
| Missing HarmonyOS port identification | ≥ 80% | TP/FP/FN, recall, five-way confusion matrix, dated negative evidence | Not adjudicated | Pending |
| Replacement knowledge base | Delivered and verifiable | Schema, source/license, review status, validity, canonical export SHA-256 | Candidate snapshot only | Pending |

## 5. Runtime Verification Record

One result is required for every profile retained in S-01. A compile target is
not interchangeable with the actual runtime.

| Profile | Actual OS / API runtime | Device or emulator | Build / signature | Scenario | Result | Evidence |
|---|---|---|---|---|---|---|
| `hos-6.0-api20-arkts-phone` | Pending | Pending | Pending | Lifecycle, incompatible APIs, replacement behavior | Pending | Pending |
| `hos-6.0-api20-arkweb-phone` | Pending | Pending | Pending | ArkWeb DOM/network/storage behavior | Pending | Pending |
| Additional approved profile | Pending | Pending | Pending | Per profile | Pending | Pending |

The existing API 20 caller-log smoke and API 26 lifecycle amendment are retained
as partial evidence. They do not fill the signed acceptance rows.

## 6. Surface Acceptance Checklist

Each committed surface must complete every applicable cell. A local smoke is not
public distribution approval. For Web and MCP, knowledge lookup must use the
same reviewed snapshot and show provenance, applicability, exclusions and
unknown/error behavior.

| Surface | Install / first run | Core workflow | Cancellation / corrupt input | Error recovery | Uninstall / rollback | Knowledge lookup | Finding parity | Distribution approval |
|---|---|---|---|---|---|---|---|---|
| CLI | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| VS Code/Cursor | Local install verified; first run Pending | Local scan/navigation verified | Pending | Pending | Pending | Pending | Scoped local parity verified | Pending |
| DevEco | Local disk install/restart verified | Local adapter smoke verified | Pending | Pending | Pending | Pending | Scoped local parity verified | Pending |
| Web | Local source-run verified; release package Pending | Local report smoke verified | Pending | Pending | Pending | Pending | Pending | Pending |
| MCP | Pending supported-host walkthrough | Local scan/explain and explicit snapshot integration verified | Pending | Pending | Pending | Local explicit-snapshot tests verified; accepted reviewed snapshot Pending | Pending cross-host parity | Pending |
| CI adapter | Source-run verified | Developer fixture verified | Pending | Pending | Pending | Pending reviewed active snapshot | Source/CLI parity verified | Pending |

## 7. Release Evidence Checklist

- [ ] Final accepted code SHA frozen and recorded.
- [ ] CLI tarball, VSIX, DevEco ZIP, Web bundle and source archive rebuilt from that SHA.
- [ ] CycloneDX SBOM, third-party notices and SHA-256 manifest regenerated.
- [ ] Dependency vulnerability, license and trademark review has no undisposed blocker.
- [ ] Clean-environment install and rollback tested for every promised surface.
- [ ] Real-project walkthrough and cross-surface finding parity pass.
- [ ] GitHub and AtomGit tags resolve to the same code SHA.
- [ ] Published artifact hashes match on every channel that hosts binaries.
- [ ] Release notes state supported profiles, known limits and deferred surfaces.
- [ ] Maintenance owner, data refresh cadence and revocation process recorded.
- [ ] Final acceptor signs the acceptance report.

## 8. Issue Closure Map

| Issue | Engineering can finish without further human input | Human decision or external evidence still required before closure |
|---|---|---|
| [#1](https://github.com/hu-qi/arkcompat/issues/1) | Prepare final signature record | S-01 through S-07 |
| [#3](https://github.com/hu-qi/arkcompat/issues/3) | B2 parser/symbol gaps, real-project negative fixtures and scan manifest | Independent scan labels and adjudication |
| [#4](https://github.com/hu-qi/arkcompat/issues/4) | Reviewed-data tooling, export checks and evaluation workflow | S-03 through S-08; licensed labels; reviewed records |
| [#5](https://github.com/hu-qi/arkcompat/issues/5) | CLI beta walkthrough, install/upgrade/recovery docs and report validation | S-02; real approved project and final product acceptance |
| [#6](https://github.com/hu-qi/arkcompat/issues/6) | Host walkthroughs, uninstall/rollback, parity automation and package checks | S-02, S-09; public distribution authorization |
| [#7](https://github.com/hu-qi/arkcompat/issues/7) | Security/performance tests, CI gates and complete acceptance bundle | S-01 through S-10; formal labels, runtime and sign-off |
| [#8](https://github.com/hu-qi/arkcompat/issues/8) | Release rehearsal, artifact rebuild and post-download smoke | S-09, S-10; final accepted SHA and publication authorization |
| [#11](https://github.com/hu-qi/arkcompat/issues/11) | Benchmark/provenance/parity/release workflow gates | S-07 and final inputs needed to enforce them |

## 9. Sign-Off

Complete one block per role. Signing this package confirms the decisions and
scope listed above; it does not replace the formal evaluation results or the
final release authorization unless those sections are explicitly included.

```text
Project owner:
Name / organization:
Decisions approved:
Amendments:
Date:
Revisit trigger:

Independent label provider:
Name / organization:
Dataset and license:
Access boundary:
Date:

Non-author reviewer:
Name / organization:
Scope reviewed:
Findings:
Date:

Final adjudicator:
Name / organization:
Accepted profiles and rubric:
Formal result accepted / rejected:
Blocking conditions:
Date:
```

# ArkCompat Project Execution Ledger

**Updated:** 2026-11-12
**Target acceptance date:** 2026-12-23
**Current baseline:** `0c94cd1487342081ec1d1109b372a0a37b4d385e`
**Current PR checks:** [43215560601](https://github.com/hu-qi/arkcompat/actions/runs/43215560601), all five required jobs passed
**Current main checks:** [43215854339](https://github.com/hu-qi/arkcompat/actions/runs/43215854339), macOS job queued; overall conclusion pending
**Current suite:** 37 test files and 588 tests passed, including 13 M5-05 security-matrix tests
**Current remote read-back:** GitHub `origin/main` and AtomGit `atomgit-https/main` both resolved to `0c94cd1487342081ec1d1109b372a0a37b4d385e`
**Documentation review baseline:** `c2324e0b31f27fd02570710a9fbfd93af75bda0e`
**Documentation review run:** [43205307730](https://github.com/hu-qi/arkcompat/actions/runs/43205307730), all five required jobs passed
**Documentation closeout merge:** `5193c65935c58386c9bf8b7a76b76690d7986c70`; [43205954055](https://github.com/hu-qi/arkcompat/actions/runs/43205954055), all five required jobs passed
**Latest complete code regression baseline:** `511790bcdac6f19bbc0dc53089336c16aeae9896` (574 tests across 35 files)
**Regression-baseline run:** [43202341237](https://github.com/hu-qi/arkcompat/actions/runs/43202341237), all five required jobs passed
**Execution entry:** [TODO](../TODO.md) is the permanent single execution entry and remains the maintenance entry after release.
**Documentation closeout read-back:** GitHub `origin/main` and AtomGit `atomgit-https/main` both resolved to `5193c65935c58386c9bf8b7a76b76690d7986c70`

This is the working ledger for completing the eight open Issues:
[#1](https://github.com/hu-qi/arkcompat/issues/1),
[#3](https://github.com/hu-qi/arkcompat/issues/3),
[#4](https://github.com/hu-qi/arkcompat/issues/4),
[#5](https://github.com/hu-qi/arkcompat/issues/5),
[#6](https://github.com/hu-qi/arkcompat/issues/6),
[#7](https://github.com/hu-qi/arkcompat/issues/7),
[#8](https://github.com/hu-qi/arkcompat/issues/8), and
[#11](https://github.com/hu-qi/arkcompat/issues/11).

[TODO](../TODO.md) is the single execution entry: choose one work package there
before starting. The detailed action checklist is
[PROJECT-TODO](PROJECT-TODO.md). This document is the execution register: each row
names the work, dependency, reproducible command or artifact, evidence
destination, accountable role, and close condition. The
[project completion plan](PROJECT-COMPLETION-PLAN.md) explains the sequence; the
[acceptance sign-off package](ACCEPTANCE-SIGNOFF-PACKAGE.md) is the form a human
owner or adjudicator completes.

## 1. Status and Evidence Rules

| Status | Meaning |
|---|---|
| `DONE` | Implementation and retained evidence exist on the stated baseline. This does not imply independent acceptance. |
| `READY` | Engineering can execute now with current inputs. |
| `GATED` | The next step requires a named human decision, approved external data, runtime access, or publication authority. |
| `BLOCKED` | A prerequisite is missing or failed and the task cannot proceed safely. Record the blocker and retry only after it changes. |

An Issue closes only when every original acceptance item is either:

1. satisfied by implementation, test, frozen input, and retained evidence; or
2. explicitly deferred by the accountable owner with scope, risk, replacement
   owner, and due date recorded.

CI, authored fixtures, screenshots, model reviews, a local package, and a
historical run are engineering evidence only. They do not establish the formal
80%/100% accuracy requirements or authorize a release.

Every completed run records at least:

```text
Issue / task ID
Commit SHA
Command and toolchain versions
Input IDs and SHA-256 values
Result and complete denominator
Evidence path or URL
Reviewer / adjudicator and date
Known limits, failed attempts and rollback
```

Use a new output directory for every evaluation or packaging run. Never overwrite
a failed result or remove a difficult sample after seeing the result.

## 2. Critical Path

| Order | Workstream | Current state | Unblocks |
|---:|---|---|---|
| 1 | Freeze the target, scoring, roles, data access, v1 surfaces, Lottie disposition, and release authority | Candidate material exists; `S-01`–`S-10` remain unsigned | Formal labels, accurate compatibility claims, release |
| 2 | Close the agreed scanner gaps and exercise an approved real project | Broad implementation exists; formal scope and independent scan labels remain open | #3, #4, #7 |
| 3 | Produce reviewed replacement records and a canonical knowledge export | Candidate-only snapshot produces no confident recommendation | #4, #5, #7 |
| 4 | Complete CLI, VS Code/Cursor, DevEco, Web, MCP, and CI workflows | Scoped local smoke exists; distribution, recovery, uninstall, and full parity remain open | #5, #6, #8 |
| 5 | Run independent holdout evaluation and the frozen runtime matrix | No independent holdout result; API 20 runtime coverage is incomplete | #7 |
| 6 | Add benchmark, provenance, parity, and release gates to CI | Five mandatory jobs pass; Stage 2 gates remain open | #11, #8 |
| 7 | Rebuild, sign or checksum, publish, verify downloads, and hand over | Packaging rehearsal exists; no accepted release or tag | #8 |

## 3. Issue Execution Ledger

The tables below are executable work items. “Owner” identifies the accountable
role, not a claim that a person has already been assigned.

### 3.1 Issue #1 · M0 scope and acceptance freeze

**Milestone:** M0 / charter and feasibility
**Original close condition:** decisions have a signed owner and evidence, or an
explicit blocker, and implementation can proceed without inventing compatibility
rules.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M0-01 | `DONE` | Record MIT for original code and the four original thresholds. | None | [DECISIONS](DECISIONS.md#d-08-repository-license-and-product-thresholds--2026-11-07), [LICENSE](../LICENSE) | Owner confirmation, PR/main runs in Issue #1 | Project owner | Confirmed and retained. |
| M0-02 | `DONE` | Prepare candidate target, scoring, partial-equivalence, missing-port, entry-surface, and data-governance proposals. | MIT and thresholds | [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md), [TARGET-MATRIX](TARGET-MATRIX.md), [QUALITY-GATES](QUALITY-GATES.md) | Public candidate documents and developer regressions | Engineering | Candidate package is reviewable. |
| M0-03 | `GATED` | Freeze `S-01` target profiles, including SDK, device, build mode, compile target, and actual runtime. | Owner/adjudicator | Complete the S-01 row and freeze record in [ACCEPTANCE-SIGNOFF-PACKAGE](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register) | Signed record with profile IDs and SHA-256 | Project owner + final adjudicator | No unqualified profile remains in the accepted matrix. |
| M0-04 | `GATED` | Freeze `S-02` v1 delivery surfaces and explicit deferrals. | Owner | Complete S-02 and the support matrix | Signed surface list | Project owner | Every promised/deferred surface has an owner and date. |
| M0-05 | `GATED` | Freeze `S-03`–`S-05` judgment units, formulas, abstention/partial-replacement rules, and missing-port taxonomy. | Owner/adjudicator | Complete S-03–S-05; validate against [evaluation harness](EVALUATION-HARNESS.md) | Signed rubric and worked examples | Project owner + adjudicator | A labeled case can be scored without an engineering assumption. |
| M0-06 | `GATED` | Freeze `S-06`–`S-07` label provider, reviewer, adjudicator, conflicts, dataset license, isolation, and correction process. | Named people/organizations | Complete S-06–S-07 and [holdout policy](HOLDOUT-ISOLATION.md) | Signed roles and access boundary | Project owner | Roles are named and independent labels can be obtained lawfully. |
| M0-07 | `GATED` | Decide `S-08` Lottie disposition and required evidence. | Independent review and approved runtime | Complete S-08; candidate remains at the private local path and SHA in the sign-off package | Decision and any scoped evidence | Project owner | Candidate is rejected, kept inactive, or approved with an exact reviewed scope. |
| M0-08 | `GATED` | Complete `S-09` legal/trademark/dependency-notice disposition. | Legal/security review | Review `THIRD-PARTY-NOTICES.json`, SBOM, external data terms | Signed legal/security disposition | Owner + legal/security reviewer | No undisposed distribution blocker. |
| M0-09 | `GATED` | Complete `S-10` release authorization only after preceding gates pass. | M0-03–08 and #7 | Complete S-10 | Signed release authorization | Project owner + acceptor | A tag and publication route can be authorized. |
| M0-10 | `GATED` | Replace candidate/pending statuses with dated decision records and close #1. | M0-03–09 | `pnpm check`; update DECISIONS/TARGET-MATRIX/sign-off; PR/main runs | Merged PR, main SHA, Issue #1 comment | Engineering + decision owners | All A1–A8 conditions are satisfied or explicitly deferred. |

### 3.2 Issue #3 · M1 deterministic scanner and CLI

**Milestone:** M1 / deterministic scanning
**Original close condition:** repeated scans are deterministic, no incompatible
conclusion rests on a package name alone, and no untrusted lifecycle script is
executed.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M1-01 | `DONE` | Maintain the capability inventory for npm/pnpm/Yarn/OHPM, workspaces, JS/TS/ETS imports and calls, target rules, and the deterministic CLI. | None | `pnpm check` | [CAPABILITY-GAP-MATRIX](CAPABILITY-GAP-MATRIX.md), regression suite, main run | Engineering | Capability matrix is current. |
| M1-02 | `GATED` | Convert every matrix gap retained by `S-01` into either an implementation task or an approved deferral. | M0-03 | Review each row in [CAPABILITY-GAP-MATRIX](CAPABILITY-GAP-MATRIX.md) | Gap disposition table in this ledger or the Issue | Engineering + adjudicator | No in-scope row is unowned. |
| M1-03 | `GATED` | Add failing fixtures and implementations for retained dependency/workspace gaps in priority order. Start with formats or edge semantics that occur in approved acceptance projects. | M1-02 | `pnpm check`; focused test plus deterministic scan | Test names, fixture hashes, report SHA-256 | Engineering | Each retained gap has a regression and either support or explicit uncertainty. |
| M1-04 | `GATED` | Add failing fixtures and implementations for retained JS/TS/ArkTS symbol gaps. Cover module/export flows, host globals, and SDK symbols only when the frozen target scope requires them. | M1-02 | `pnpm check`; scan fixture with `--runtime arkts --release 6.0.0 --api-level 20` | Source-inventory report and negative cases | Engineering | Same input produces byte-identical findings; unsupported syntax is visible. |
| M1-05 | `GATED` | Run the scanner twice over every approved project and compare the canonical JSON bytes. | Approved project | `node apps/cli/dist/index.js scan <project> --runtime arkts --release 6.0.0 --api-level 20`; `shasum -a 256` | Two reports and comparison manifest | Engineering | Repeated scans are identical; nondeterminism has a tracked root cause. |
| M1-06 | `DONE` | Verify the no-execution boundary with malicious lifecycle/package scripts and malformed inputs. | None | `pnpm check`; controlled probe in a disposable directory | [Scanner security evidence](SCANNER-SECURITY.md), [machine-readable record](evidence/scanner-security-2026-11-12.json) and negative tests | Engineering + security reviewer | Focused regressions prove no package script executes and tested resource/input limits fail explicitly. |
| M1-07 | `GATED` | Generate label-blind scan predictions for the approved holdout. | M0-03, M0-06 | `pnpm evaluate predict-dependency-graph <project> <cases.json>`; `predict-apis ...` | Prediction JSON, cases SHA, report SHA, rules SHA | Engineering | Every approved case has a bound prediction; no hidden label was read. |
| M1-08 | `GATED` | Score dependency scanning at ≥80% and incompatible API detection at ≥80% with complete denominators. | M1-07, #7 | `pnpm evaluate <labels.json> <predictions.json> <new-evidence-dir>` | Results, confusion matrix, failed runs, adjudication | Adjudicator | Thresholds pass on the frozen independent dataset or #3 remains open. |
| M1-09 | `GATED` | Document supported formats, unsupported constructs, resource limits, reproduction, and rollback. | M1-03–06 | Update scanner/workspace docs and CLI help | Docs-integrity run and review | Engineering | A reviewer can reproduce scope without reading source. |

### 3.3 Issue #4 · M2 knowledge base and independent evaluation inputs

**Milestone:** M2 / knowledge and evaluation
**Original close condition:** a verifiable replacement-relationship knowledge
base exists, confidently recommended substitutes are 100% correct under the
agreed rubric, and missing-port identification is at least 80%.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M2-01 | `DONE` | Implement strict knowledge schemas, provenance, validity/review states, offline query/export, and five-way classification. | None | `pnpm check` | [KNOWLEDGE-CONTRACT](KNOWLEDGE-CONTRACT.md), [KNOWLEDGE-SEMANTICS](KNOWLEDGE-SEMANTICS.md) | Engineering | Candidate/expired/ambiguous/mismatched records abstain. |
| M2-02 | `DONE` | Implement label-blind adapters for dependency graph, API, replacement mapping, and missing port. | Knowledge/scan contracts | `pnpm evaluate predict-* ...` | [EVALUATION-HARNESS](EVALUATION-HARNESS.md), adapter tests | Engineering | Prediction schemas reject expected labels and bind input hashes. |
| M2-03 | `GATED` | Approve provenance sources, dataset licenses, review rules, and who may promote candidate records. | M0-05–07 | Complete [DATA-PROVENANCE-REGISTER](DATA-PROVENANCE-REGISTER.md) rows | Signed data/review policy | Data owner + non-author reviewer | A record can move to reviewed only with permitted evidence. |
| M2-04 | `GATED` | Build a reviewed, versioned replacement dataset covering the frozen evaluation scope. | M2-03 | Update canonical knowledge JSON; export with `knowledge-export` | Reviewed record IDs, source URLs, licenses, validity, export SHA | Reviewer + data owner | Dataset is complete for the frozen scope and exports deterministically. |
| M2-05 | `GATED` | Resolve the Lottie candidate under `S-08`. | Runtime/stress evidence and owner decision | Keep private local candidate inactive until approval | Candidate SHA and decision | Project owner | Approved reviewed record or explicit non-import. |
| M2-06 | `GATED` | Freeze the independent holdout cases and hidden labels. | M0-06 | Generate cases manifest and labels manifest with SHA-256 | Hashes, license, access boundary | Label provider | No case/label appears in public CI or repository history. |
| M2-07 | `GATED` | Generate replacement and missing-port predictions without reading labels. | M2-04, M2-06 | `pnpm evaluate predict-replacements ...`; `predict-missing-ports ...` | Bound prediction JSON and canonical snapshot SHA | Engineering | Every case has one prediction or an explicit abstention. |
| M2-08 | `GATED` | Score confident replacement identification at 100% with non-empty coverage; score missing-port identification at ≥80%. | M2-07 | `pnpm evaluate ... <new-evidence-dir>` | Complete TP/FP/FN/TN, abstentions, coverage, error analysis | Adjudicator | Zero false confident recommendations; thresholds pass on frozen data. |
| M2-09 | `GATED` | Publish a deliverable canonical knowledge export and update/revocation procedure. | M2-04, M2-08 | Versioned JSON, schema, SHA-256, update/revoke instructions | Release bundle entry | Data owner + engineering | Acceptor can query and reproduce the exact reviewed snapshot. |

### 3.4 Issue #5 · M3 advice, reports, and CLI beta

**Milestone:** M3 / advice and reports
**Original close condition:** every finding and recommendation is traceable to
location, target profile, rule/data version, evidence, and a next action; a real
project completes the full workflow.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M3-01 | `DONE` | Implement JSON/Markdown/SARIF reports and deterministic assessment explanations. | Scanner/rule contracts | `pnpm check`; scan and `assess` fixtures | [REPORT-FORMATS](REPORT-FORMATS.md) | Engineering | Authored fixtures preserve IDs, locations, evidence, and limitations. |
| M3-02 | `GATED` | Obtain authorization for a real project and record its version/hash. | Project owner | Use an approved project snapshot; do not upload private source | Input manifest and access record | Project owner + engineering | Approved project is available under recorded terms. |
| M3-03 | `GATED` | Execute scan → inspect finding → navigate code → query replacement → show recommendation → export report on the approved project. | M3-02 | CLI/IDE/Web commands from the support matrix | Report, navigation log, source locations, errors/unknown inventory, SHA-256 | Engineering | One end-to-end journey is reproducible without author machine state, and errors/unknown remain visible. |
| M3-04 | `DONE` | Document and exercise CLI beta install, upgrade, uninstall, offline, corrupted-input, resource-limit, exit-code, rollback, and recovery behavior. | None | `pnpm package:cli <new-output>`; `pnpm verify:runtime-provenance <output>`; `pnpm vitest run tests/cli-package.test.ts` | [CLI-PACKAGE-REHEARSAL](CLI-PACKAGE-REHEARSAL.md) and [machine-readable lifecycle evidence](evidence/cli-beta-lifecycle-2026-11-12.json) | Engineering | Authored lifecycle regression and recovery behavior are retained; clean independent host, public beta, signing, and product acceptance remain under M3-07/M3-08. |
| M3-05 | `DONE` | Validate report schema compatibility and stable bytes across JSON, Markdown, SARIF, CLI, and Web. | M3-01 | `pnpm check`; schema validators; repeat export | [Report stability evidence](evidence/report-stability-2026-11-12.json), [REPORT-FORMATS](REPORT-FORMATS.md) | Engineering | Authored-fixture schemas, repeat bytes, canonical fields and SARIF projection agree; presentation differences are documented. |
| M3-06 | `GATED` | Confirm that recommendations use only reviewed and applicable knowledge. | M2-04 | Run the assessment with candidate, expired, conflicting, and mismatched records | Negative-case report | Engineering + reviewer | Only reviewed applicable records produce confident recommendations. |
| M3-07 | `GATED` | Complete user/product acceptance for the CLI beta and report semantics. | M3-03–06, M0-04 | Review walkthrough and output with the product owner | Signed walkthrough record | Product owner | Beta workflow and known limits are accepted or explicitly amended. |
| M3-08 | `GATED` | Publish an approved CLI beta with a reproducible sample and benchmark guide. | M2-04, M3-03–07, S-02/S-09 | Clean-install a signed/checksummed candidate; run sample and benchmark commands | Distribution URL, package SHA, sample/report hashes, host log | Engineering + release owner | A recipient can install, run, recover, uninstall and reproduce the sample without author state. |
| M3-09 | `GATED` | Decide whether optional remote AI is deferred or included, and verify its privacy and determinism controls if included. | M0-04, S-02 | Exercise disabled/default state, consent, pre-send preview, sanitization, revocation and hostile model output | Privacy test log and ADR | Product owner + security reviewer | v1 is explicitly AI-off, or every required consent/privacy/non-override control blocks release on failure. |

### 3.5 Issue #6 · M4 multi-surface delivery

**Milestone:** M4 / multi-entry delivery
**Original close condition:** each promised surface scans the same fixture with
semantically equivalent results and has install/run evidence.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M4-01 | `DONE` | Implement local CLI, VS Code/Cursor VSIX, DevEco disk-install probe, Web, MCP, and source-run CI adapter. | Shared core | `pnpm check` | [DELIVERY-STATUS](DELIVERY-STATUS.md), surface docs | Engineering | Each surface has scoped local smoke evidence. |
| M4-02 | `GATED` | Create one canonical parity fixture and expected report using the frozen core/rules/knowledge versions. | M0-04 | Scan fixture once; run every surface adapter | Input SHA and expected canonical report | Engineering | Expected report is stable and contains locations and evidence. |
| M4-03 | `GATED` | Automate finding parity across CLI, VS Code extension process, DevEco adapter, Web, MCP, and CI. | M4-02 | Run each entry point; compare finding ID/status/evidence/location | `parity-report.json` and host-version log | Engineering | Every promised surface yields equivalent findings or an explained adapter-only difference. |
| M4-04 | `GATED` | Verify clean install, first run, cancellation, corrupt input, recovery, uninstall, and rollback for CLI and VSIX. | M4-02 | Clean-profile scripts/manual run logs | Installation and rollback logs | Engineering | A clean host can install, run, recover, remove and restore each package. |
| M4-05 | `GATED` | Validate DevEco on the frozen IDE version and a real HarmonyOS project. | DevEco access and M0-03 | `pnpm package:deveco <DevEco-Studio.app> <new-output> [--prestage]`; install and scan | [DEVECO-FEASIBILITY](DEVECO-FEASIBILITY.md) plus new host log | Engineering + owner | Disk install, restart, scan, navigation, update, and uninstall are recorded. |
| M4-06 | `GATED` | Verify Web and MCP local hosts, permissions, size limits, corrupt snapshots, cancellation, recovery, uninstall and offline behavior. | M4-02 | Run documented host commands | Host/version logs and error traces | Engineering | No default upload, no unconsented AI transfer, and every failure has a documented recovery path. |
| M4-07 | `GATED` | Verify the CI action in a real workflow with fixed inputs, minimal permissions, JSON/SARIF retention, and failure feedback. | M4-02 | Use `.github/actions/arkcompat-scan` in a test repository/workflow | Workflow run and downloaded artifacts | Engineering | Required report appears; failed scans fail the job and do not publish secrets. |
| M4-08 | `GATED` | Approve public distribution, signing/trust, update route, and deferred surfaces. | M0-04, M0-08 | Complete S-02/S-09 and host-specific distribution records | Signed distribution matrix | Project owner + security | Every surface is released or explicitly deferred with owner/date. |
| M4-09 | `GATED` | Verify evidence-backed knowledge lookup in Web, including provenance, version, applicability, exclusions and unknown/error behavior. | M2-04, M4-02 | Load an approved snapshot; query reviewed, candidate, expired, conflicting and absent records | Query report and snapshot SHA | Engineering + reviewer | Reviewed applicable evidence is displayed; candidate data cannot become a confident recommendation. |
| M4-10 | `GATED` | Verify evidence-backed mapping queries in MCP and the supported host matrix. | M2-04, M4-02 | Query reviewed, candidate, expired, conflicting and absent records through stdio | Protocol transcript and snapshot SHA | Engineering + reviewer | Web/MCP/CLI agree on canonical evidence, verdict and exclusion reasons or document adapter-only differences. |

### 3.6 Issue #7 · M5 independent acceptance, runtime, safety, and performance

**Milestone:** M5 / release candidate verification
**Original close condition:** integration, privacy/security, packaging,
performance, runtime, and independent holdout acceptance pass with no unresolved
blocking defect.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M5-01 | `DONE` | Maintain mandatory regressions, coverage floors, privacy checks, and an evaluation harness. | None | `pnpm check` | Main run and developer evidence | Engineering | Existing required gates remain green. |
| M5-02 | `GATED` | Freeze code, rules, knowledge, cases, labels, toolchain, SDK, devices, and target profiles into one manifest. | M0-03–07 | Generate immutable SHA-256 manifest | Acceptance run directory | Engineering + adjudicator | Every evaluation input is immutable and traceable. |
| M5-03 | `GATED` | Execute the four formal metrics with complete denominators and retained failures. | M1-07–08, M2-07–08 | `pnpm evaluate ... <new-evidence-dir>` for each scope | Results JSON/Markdown, confusion matrices, error analysis | Adjudicator | All confirmed thresholds pass or Issue remains open. |
| M5-04 | `GATED` | Validate each frozen profile on its actual runtime, distinguishing target from runtime. | M5-02 | Install and run the signed HAP/probe on the approved device/emulator | Device/OS/API/build logs and hashes | Runtime owner | Required runtime rows pass; unsupported environments are explicit. |
| M5-05 | `IN REVIEW` | Complete security probes for path escape, symlinks, special files, malformed/large input, resource exhaustion, secrets, and script execution. | None | `pnpm exec vitest run tests/security-matrix.test.ts`; `pnpm check` | [Security matrix evidence](evidence/security-negative-matrix-2026-11-12.json), [scanner security](SCANNER-SECURITY.md), PR/main runs | Engineering + security reviewer | Local author matrix passes 13/13 and the full gate passes 37 files/588 tests; PR #109 is merged. Main run 43215854339 remains queued for macOS; independent review also remains. Issue #7 stays open. |
| M5-06 | `GATED` | Record performance for small, medium, and large approved inputs against a frozen budget. | M0-03 and approved projects | Time and peak-memory runs with repeated measurements | Benchmark JSON/Markdown | Engineering | Results are within budget or have an accepted remediation/deferral. |
| M5-07 | `READY` | Produce dependency, SBOM, notice, trademark, and distribution evidence for legal/security disposition. | None | `pnpm audit`; `pnpm package:cli`; `pnpm verify:runtime-provenance` | Audit, SBOM, notices, SHA-256, review record | Engineering; then security/legal reviewer | No blocker remains or formal disposition is signed. |
| M5-08 | `GATED` | Retain first failures and track every defect through fix and independent regression. | M5-03–07 | Defect register linked to failing run and corrective PR | Corrective run and reviewer sign-off | Engineering + reviewer | No blocking defect is open. |
| M5-09 | `GATED` | Assemble and adjudicate the complete acceptance package. | M5-02–08 | Complete formal results, runtime, safety, performance, and sign-off sections | Immutable acceptance bundle | Final adjudicator | Acceptor can reproduce scores and behavior without the author’s machine. |

### 3.7 Issue #11 · CI quality gates

**Milestone:** M0 / CI foundation with Stage 2 completion
**Original close condition:** mandatory PR checks block bad changes, and
benchmark, provenance, surface parity, and release checks are enforced when their
products exist.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| CI-01 | `DONE` | Enforce five required GitHub Actions jobs, strict/up-to-date branches, least privilege, pinned actions, and `gh` triage. | None | PR/main run inspection | [CI-STRATEGY](CI-STRATEGY.md), branch-protection read-back | Engineering | Protected PRs cannot merge when required checks fail. |
| CI-02 | `DONE` | Run build, format, lint, types, tests, schemas, CLI/action parity, coverage, and provenance rehearsal. | Workspace exists | `pnpm check`; main run | Latest main run and artifacts | Engineering | Existing jobs pass on supported runners. |
| CI-03 | `GATED` | Add an independent benchmark gate without exposing blind labels. | M5-02–03 | CI job reads only approved aggregate inputs/outputs | Failed-threshold probe and passing run | Engineering + adjudicator | A below-threshold frozen result fails without publishing labels. |
| CI-04 | `GATED` | Add rules/knowledge provenance and canonical-export checks. | M2-04 | Validate source/version/license/review fields and deterministic export hash | Workflow log and negative probe | Engineering | Candidate, expired, or unreviewed data cannot become a recommendation. |
| CI-05 | `GATED` | Add shipped-surface parity checks for every promised entry point. | M4-02–03 | Run canonical fixture through surface adapters; compare findings | Artifact and diff report | Engineering | A parity regression fails the required job. |
| CI-06 | `GATED` | Add release packaging, SBOM/notices/checksum, clean-install, and download smoke checks. | M5-07 | Package artifacts; verify provenance; install in clean job | Artifact hashes and smoke logs | Engineering | A broken package or provenance mismatch fails the workflow. |
| CI-07 | `GATED` | Record a deliberate failure for each new gate, then remove the probe and verify the green main run. | CI-03–06 | Separate temporary PRs/commits with retained run URLs | Failure and recovery runs | Engineering | Each gate has demonstrated enforcement. |
| CI-08 | `GATED` | Update protection/required checks and close #11 after Stage 2 is verified. | CI-03–07 | Read back required checks and main run | Protection API output and Issue comment | Engineering | Stage 0–2 conditions are all satisfied. |

### 3.8 Issue #8 · M6 release and acceptance

**Milestone:** M6 / formal acceptance and release
**Original close condition:** an acceptor can reproduce scores and functional
behavior without depending on the author’s local machine.

| ID | Status | Concrete action and deliverable | Dependency | Command / artifact | Evidence | Owner | Close condition |
|---|---|---|---|---|---|---|---|
| M6-01 | `GATED` | Freeze the final accepted code SHA and approved rules, knowledge, toolchain, and profile IDs. | M5-09 | Record the exact acceptance SHA and manifests | Signed freeze record | Project owner + adjudicator | Release inputs cannot change without a new acceptance run. |
| M6-02 | `GATED` | Rebuild CLI, VSIX, DevEco ZIP, Web bundle, source archive, SBOM, notices, and SHA-256 manifest from the accepted SHA. | M6-01 | `pnpm package:cli`; `pnpm package:vscode`; `pnpm package:deveco`; `pnpm verify:runtime-provenance` | Artifact hashes and rebuild comparison | Engineering | Two clean builds are byte-identical or reproducibility limits are documented. |
| M6-03 | `GATED` | Apply the approved signing/checksum and trust route. | M0-08–09, M6-01 | Use authorized signing environment; never commit keys | Signature/checksum verification record | Release owner | Every published artifact has an approved integrity mechanism. |
| M6-04 | `GATED` | Install every promised artifact in a clean environment and rerun the walkthrough and smoke suite. | M6-02 | Clean-host install/run/uninstall commands | Logs, report hashes, host versions | Engineering | Each promised surface works from the published package. |
| M6-05 | `GATED` | Finish quick start, architecture, support matrix, knowledge update, upgrade/uninstall, rollback, and known-limits docs. | M0-04 | Docs changes plus `pnpm check` | Documentation PR/run | Engineering + product owner | A new user can install and reproduce the supported workflow. |
| M6-06 | `GATED` | Record one full migration assessment with reproducible inputs and commands. | M3-03, M6-04 | Run the approved walkthrough; export report | Video/transcript, input/report SHA, command log | Engineering + product owner | Demonstration is repeatable without private author state. |
| M6-07 | `GATED` | Obtain final reviewer and acceptor sign-off, including any approved waivers. | M5-09, M6-03–06 | Complete [ACCEPTANCE-SIGNOFF-PACKAGE](ACCEPTANCE-SIGNOFF-PACKAGE.md#9-sign-off) | Signed acceptance package | Final adjudicator | Every requirement is passed or formally waived with owner/date. |
| M6-08 | `GATED` | Create the formal tag/release and publish approved assets. | M6-07 | Create annotated tag; publish assets and notes | Release URL, tag SHA, artifact hashes | Release owner | Release resolves to the accepted SHA and assets. |
| M6-09 | `GATED` | Push code and tag to GitHub and AtomGit; read back both remotes and verify hosted artifact hashes. | M6-08 | `git push origin main <tag>`; `git push atomgit-https main <tag>`; `git ls-remote` | Read-back manifest | Engineering | GitHub and AtomGit resolve the same main/tag SHA; hosted asset hashes match. |
| M6-10 | `GATED` | Run post-release download/install smoke and document rollback. | M6-08–09 | Download from each channel; verify checksums; install; run smoke | Download and installation logs | Engineering + release owner | Published artifacts pass outside the build environment. |
| M6-11 | `GATED` | Update ROADMAP, DELIVERY-STATUS, DECISIONS, and all Issue statuses; hand over maintenance. | M6-07–10 | Documentation PR and Issue comments | Final main run, maintainer roster, data refresh/revocation cadence | Engineering + project owner | Ownership and future updates are explicit. |
| M6-12 | `GATED` | Close all completed Issues, remove temporary planning files where appropriate, and retain a permanent release record. | M6-11 | Final repository audit | Zero-open checklist and final main SHA | Project owner | No accepted requirement or blocker remains untracked. |

## 4. Human Decision Queue

These are the ten sign-off records that gate formal claims. They should be
reviewed together before the independent evaluation starts.

| Decision | Required answer | Why it blocks progress | Record location |
|---|---|---|---|
| S-01 | Exact target profile and actual runtime matrix | A build target is not runtime proof; profiles determine every denominator | [Sign-off package](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register) |
| S-02 | v1 committed surfaces and deferrals | Determines packaging, parity, and acceptance scope | [TARGET-MATRIX](TARGET-MATRIX.md#2-multi-surface-v1-delivery-matrix-2026-12-23-candidate-scope--a6) |
| S-03 | Units and formulas for four metrics | “Correctness” and “identification rate” need exact denominators | [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md) |
| S-04 | Partial replacement and abstention policy | Prevents zero-recommendation 100% and hidden coverage loss | [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md#2-partial-equivalence--abstention-policy-a2) |
| S-05 | Missing-port taxonomy and negative evidence | Registry absence alone cannot prove a missing port | [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md#3-missing-port-adjudication-criteria-a3) |
| S-06 | Label provider, non-author reviewer, final adjudicator, conflict handling | Engineering cannot self-adjudicate acceptance | [DECISIONS](DECISIONS.md) |
| S-07 | Holdout source, license, hash freeze, blind access, failure retention | Formal labels cannot be generated or protected without it | [HOLDOUT-ISOLATION](HOLDOUT-ISOLATION.md) |
| S-08 | Lottie candidate disposition | The candidate is local and inactive; it cannot be inferred into the KB | [Sign-off package](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register) |
| S-09 | Legal, trademark, SBOM, notices, distribution disposition | A locally built artifact is not legally or operationally publishable | [Sign-off package](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register) |
| S-10 | Release authorization and acceptor | Prevents engineering self-authorization | [Sign-off package](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register) |

## 5. Required Evidence Layout

Use immutable directories and keep blind labels outside public repository
history. The following names are conventions; the manifest values are what make
the evidence auditable.

```text
docs/evidence/
  acceptance-2026-12/
    manifest.json
    commands.txt
    dependency-scan/
      cases.json
      predictions.json
      results.json
      results.md
    incompatible-api/
    replacement-mapping/
    missing-port/
    runtime/
      target-matrix-results.json
      device-sdk-logs/
    parity/
      comparison.json
      comparison.md
    security/
      threat-review.md
      audit.json
      license-review.md
    performance/
      benchmark.json
    release/
      SBOM.cdx.json
      THIRD-PARTY-NOTICES.json
      SHA256SUMS
      download-smoke.json
      github-atomgit-readback.json
    acceptance-signoff.md
```

The public repository may contain hashes, source links, licenses, aggregate
results, commands, and non-sensitive logs. It must not contain hidden labels,
credentials, signing keys, private source, tokens, or author-only absolute paths.

## 6. Reproducible Commands

Run from a clean checkout with the pinned toolchain:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

Package and validate the local CLI rehearsal in a new directory:

```sh
out=$(mktemp -d)
pnpm package:cli "$out/arkcompat"
pnpm verify:runtime-provenance "$out/arkcompat"
node "$out/arkcompat/dist/index.js" --help
```

Build the editor and DevEco candidates with the exact host tools:

```sh
pnpm package:vscode /absolute/path/to/vsce /new/absolute/output/arkcompat.vsix
pnpm package:deveco /Applications/DevEco-Studio.app /new/absolute/output/deveco --prestage
```

Run the evaluation harness only with a new evidence directory:

```sh
pnpm evaluate <labels.json> <predictions.json> /new/absolute/evidence-directory
```

Generate the label-blind predictions before supplying labels:

```sh
pnpm --silent evaluate predict-dependencies <project> <cases.json>
pnpm --silent evaluate predict-dependency-graph <project> <cases.json>
pnpm --silent evaluate predict-apis <project> <cases.json> <rules.json>
pnpm --silent evaluate predict-replacements <cases.json> <snapshot.json> <as-of-utc>
pnpm --silent evaluate predict-missing-ports <cases.json> <snapshot.json> <as-of-utc>
```

These commands prove local mechanics. They do not prove an independent accuracy
score until the inputs, roles, rubric, and adjudication are frozen.

## 7. A1–A8 Action Register

This register is the detailed counterpart to the root `TODO.md`. Dates are
target dates, not evidence of completion. “Owner” is an accountable role; a
role is not an assigned person until the sign-off package records a name.

| ID | Status | Work / accountable role | Target | Concrete next action | Evidence / close condition | Issue closure authority |
|---|---|---|---|---|---|---|
| A1 | `IN REVIEW` | M5-05 security negative and resource-boundary matrix; Engineering Lead + Security Reviewer | 2026-11-15 | PR #109 is merged and all five PR checks passed; finish main run 43215854339, comment #7 and read back AtomGit | 13 security tests, evidence JSON, scanner-security docs, PR/main run; independent security review remains | Cannot close #7 alone; independent security review remains |
| A2 | `READY` | M5-07 supply-chain and distribution audit; Engineering Lead + Security Reviewer + Legal/Release Owner | 2026-11-22 | Generate audit, SBOM, notices, licenses and artifact hashes in a fresh directory; reconcile every dependency and gap | Evidence JSON, provenance verification, review package; no undisposed vulnerability/license blocker | Feeds S-09; cannot close #7/#8 or release |
| A3 | `GATED` | S-01–S-10 decision package; Project Owner + Final Adjudicator + named independent roles | 2026-11-15 review; decisions before dependent gates | Obtain named decisions with approve/amend/reject/defer, rationale, evidence, conflict/access boundary and revisit trigger | Signed package plus decisions/target matrix; no engineering defaults presented as approval | Cannot close #1 until every required decision is signed or formally deferred |
| A4 | `GATED` | In-scope scanner and reviewed-knowledge gaps; Engineering Lead + Independent Label Provider + Non-author Reviewer | 2026-11-29 | Disposition every capability-matrix row; add failing fixtures; produce reviewed snapshot and canonical export | Gap disposition, regressions, snapshot SHA, source/license/review/validity/revocation records | Cannot close #3/#4 alone; A5 independent scoring still required |
| A5 | `GATED` | Independent holdout, four metrics and runtime matrix; Label Provider + Engineering + Runtime Owner + Final Adjudicator | 2026-12-06 predictions; 2026-12-13 adjudication | Freeze manifest, generate label-blind predictions, score with complete denominators, execute actual-runtime profiles | Acceptance evidence tree, failures and remediation, signed adjudication; thresholds and knowledge-base delivery pass | Cannot close #7 alone; release and runtime sign-off remain |
| A6 | `GATED` | Product workflow and surface parity; Engineering Lead + Product Owner + Runtime/Release Owner | 2026-12-13 | Use one canonical fixture and approved real project across every committed surface; verify install, recovery, uninstall/rollback and finding parity | Clean-host walkthrough, parity report, host/toolchain logs, product acceptance | Cannot close #5/#6 without approved real project and product acceptance |
| A7 | `GATED` | Stage 2 CI enforcement; Engineering Lead + Final Adjudicator | 2026-12-15 | Add benchmark, provenance, parity, packaging/SBOM/checksum and download-smoke required gates; demonstrate failure then recovery | Workflow and PR/main runs for deliberate failure and recovery, protection read-back | Cannot close #11 unless every bad input is actually blocked |
| A8 | `GATED` | Accepted-SHA rebuild, release and handover; Release Owner + Final Adjudicator + Project Owner | 2026-12-23 | Rebuild twice from accepted SHA; sign/checksum; publish; install/download-smoke; read back GitHub and AtomGit main/tag/artifact hashes | Release assets, checksums, readback manifest, final acceptance package, maintenance handover | Only then close Issues whose original conditions are met |

The action register does not change the dependency order: A1 is awaiting the
final main CI result; A2 engineering evidence can start now while S-09 remains unsigned; A3
requires named people; A4 depends on the frozen scope and data decisions; A5
depends on A3/A4; A6 depends on S-02 and approved inputs; A7 depends on stable
A4–A6 outputs; A8 requires all preceding gates.

## 8. Completion Definition

The project is complete only when:

- the four accuracy/identification thresholds and the knowledge-base delivery
  requirement pass on the signed independent holdout;
- the required runtime profiles have actual-runtime evidence;
- all promised surfaces install, run, recover, and produce equivalent findings;
- security, performance, license, SBOM, notices, and reproducibility checks have
  no undisposed blocker;
- the formal acceptance package is signed by the named adjudicator;
- the release artifacts are published from the accepted SHA and pass clean
  download/install smoke tests;
- GitHub and AtomGit resolve the same main and tag SHA and, where both host
  binaries, the same artifact hashes;
- the maintenance owner, data refresh/revocation process, and next review date
  are recorded.

Until those conditions are met, the corresponding Issues remain open and this
ledger records the exact remaining work rather than presenting a release claim.

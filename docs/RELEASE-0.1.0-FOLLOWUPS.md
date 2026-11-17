# ArkCompat v0.1.0 follow-ups · 2026-11-15 (updated 2026-11-17)

This register separates work that can still be completed by engineering from work that depends on external data, named reviewers or Huawei/owner authorization. It follows [RELEASE-0.1.0-VERIFICATION](RELEASE-0.1.0-VERIFICATION.md); evidence is in [`docs/evidence/release-0.1.0-verification/`](evidence/release-0.1.0-verification/) and the 2026-11-17 [CI closure record](RELEASE-0.1.0-CI-CLOSURE.md).

**Decision boundary (2026-11-17):** D-05 (DevEco `--disk-install` route confirmed; public marketplace deferred) and D-08 (MIT for original code) remain closed owner decisions and are not reopened here. Windows packaging, public-registry publication, signing and attestation stay optional follow-ups; they are not blockers for this engineering review round, and no such expansion is claimed.

**Priority:** P0 = leak, arbitrary execution, escape or false confident recommendation; P1 = entry unusable, silent obvious miss, report semantic error or untraceable artifact; P2 = hardening or maintainability.

**Owner:** `TBD` for every item until a named person accepts it. A merged commit is not completion; the stated completion condition must be recorded with evidence.

## A. This-round engineering

Items in this section are actionable in the repository. Items A-01 to A-04 are the remaining blockers for replacing the defective published release; the rest close the entry/parity gaps found in this round.

| ID | Issue | Fact / gap | Priority | Next step | Dependency | Owner | Completion condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | #8 | The published release body says the DevEco plugin is “Huawei official”, claims 243 dependencies for the 12-package runtime notices, and omits the external Node 22.13+/24 prerequisite. | P1 | Approve corrected release-note text; publish it only with the next release. | Owner approval; do not rewrite the published release body without sign-off. | TBD | Next release notes state independent community status, distinguish 243 audit dependencies from 12 runtime notices, and state Node 22.13+/24 for CLI/VSIX. |
| A-02 | #8 | F-01–F-04 are fixed on `codex/v0.1.0-release-verification` but not released; published assets remain broken/0.0.0. | P1 | Push the branch, open a reviewable PR, pass CI, then cut a new patch release. | A-03; review; owner release authorization. | TBD | New tag/assets are published; every asset identifies 0.1.x; Web starts standalone; two rebuilds match; release body corrected. |
| A-03 | #8, #11 | The fix branch had no GitHub Actions run when the 2026-11-15 record was written. The branch is now pushed as a Draft PR; the first-run status is recorded in the CI closure evidence. | P1 | Observe `gh pr checks`; use `gh run view RUN_ID --log-failed` for failures. | None beyond normal remote branch/PR publication. | TBD | All required jobs pass on the exact fix SHA; branch SHA and run ID are recorded. |
| A-04 | #8 | Release packaging determinism was verified only on macOS. | P2 | The `release-package` CI job now packages twice on Ubuntu 24.04 and macOS 15 with pinned tools. | A-03. | TBD | Both runners pass the double-build comparison and artifact verifier. Within-runner byte identity is required; cross-OS byte identity is **not** required and cross-runner parity is functional only. |
| A-05 | #6 | DevEco host UI was not exercised against the release ZIP this round. | P1 | Install the fixed ZIP in an isolated DevEco profile; scan, open first finding, compare report bytes/IDs with CLI, then uninstall. | Fixed ZIP; macOS arm64 DevEco 26.0.0.865. | TBD | Host record includes install/activate/scan/jump/recover/uninstall and a retained report hash/ID comparison. |
| A-06 | #6 | Cursor host was not run; the application is absent. | P1 | Install the fixed VSIX in a pinned Cursor version and repeat scan/jump/recovery. | Cursor installation; A-02 artifact. | TBD | Cursor host record matches the CLI on finding IDs, statuses and locations; limits documented. |
| A-07 | #6 | Full six-surface parity is `NOT-RUN`; no single retained comparison covers CLI, VS Code, Cursor, DevEco, Web, MCP and CI. | P1 | Add a parity harness or evidence script that runs each available surface on one frozen fixture and records IDs/status/locations/rule-knowledge versions/evidence. | A-05, A-06; stable artifacts. | TBD | One report shows equality or documented, reviewed surface differences; absent hosts are explicitly `NOT-RUN`. |
| A-08 | #11 | GitCode remote read-back is blocked by missing credentials. | P1 | Configure a read-only credential or have the owner run `git ls-remote`; do not weaken authentication. | Owner-provided credential. | TBD | GitHub, AtomGit and GitCode `main`/tag read back the same commit; artifact hashes are comparable. |
| A-09 | #11 | Stage 2 CI (benchmark, parity, release gates) is still not implemented. | P1 | Add gates only after the corresponding products exist; do not fabricate benchmark results. | Independent benchmark products; A-07. | TBD | CI enforces the documented benchmark/parity/release checks and fails on regression. |
| A-10 | #8, #6 | CLI/VSIX documentation did not consistently state the external Node prerequisite; release notes implied an embedded runtime. | P1 | README, CLI rehearsal and DevEco feasibility docs now distinguish bundled JavaScript from an external Node executable. The published release body still needs A-01. | None for docs; A-01 for release text. | TBD | Every distribution surface states Node 22.13+/24 versus the IDE-provided DevEco Node; no “no runtime needed” claim remains. |
| A-11 | #8, #11 | Rebuild/checksum/safe-unpack verification was manual. | P2 | Implemented as `scripts/verify-release.mjs` plus the `release-package` CI job: two builds, byte comparison, `SHA256SUMS`, safe archive entries/modes, extracted-tree checks, internal CLI checksums, SBOM/notices equality and CLI/Web smoke. | A-03. | TBD | The release gate fails on any digest mismatch, unsafe path, link or permission anomaly. |
| A-12 | #5, #8 | The report schema now accepts any semver `scannerVersion`; this compatibility change needs release documentation. | P2 | Document that same `schemaVersion` reports from any release are readable and non-semver values are rejected. | Next release. | TBD | Release notes and contract docs describe the compatibility window and rejection behavior. |
| A-13 | #8 | README, ROADMAP, DELIVERY-STATUS, PROJECT-MASTER-TODO, PROJECT-COMPLETION-ACTIONS and DECISIONS contained stale “unreleased/no tag” and 0.0.0 statements. | P1 | Reconciled in this round; keep them synchronized with each release/review. | None. | TBD (maintenance) | Docs state the published-release status, defects, fix candidate and 0/5 acceptance consistently. |

### Completed in this round (engineering)

| Item | Evidence |
| --- | --- |
| Release identity constant and `--version` | `a52898c`; CLI/SBOM/VSIX/MCP/reports report 0.1.0 |
| Standalone Web bundle and schema | `a52898c`; standalone server smoke passes |
| Deterministic tar/ZIP and clean-worktree guard | `a52898c`, `a433b71`; 8/8 byte-identical rebuilds |
| Same-schema cross-release report import | `d807030`; 0.0.0 and 0.1.0 reports both render |
| Full local gate | 39 files / 598 tests, coverage recorded, docs 62 files |
| Real-project and security sweeps | 3 projects, 13/13 negative tests, audit 0 advisories |
| Documentation reconciliation | This deliverable set and the linked project docs |

## B. Follow-up engineering

These items need product/data work beyond this verification round; they are not blocked by Huawei unless noted.

| ID | Issue | Fact / gap | Priority | Next step | Dependency | Owner | Completion condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B-01 | #4 | Curated knowledge has 6 candidate records, 0 reviewed; no confident substitute is produced. | P1 | Obtain independently reviewed records with provenance, version ranges and review identity; import only after approval. | Independent reviewers; data/license approval. | TBD | Reviewed snapshot passes schema/semantics; every recommendation has review identity and evidence; candidates stay excluded. |
| B-02 | #4 | Lottie remains inactive pending API 20 runtime, signed Release/AOT device, stress/leak and complex-animation evidence. | P1 | Execute the scoped prerequisites, then independent review; do not activate from static evidence. | Device/runtime environment; independent review. | TBD | Lottie record has the required runtime/device/stress evidence and an explicit review decision. |
| B-03 | #7 | No formal accuracy measurement exists; fixtures and real-project counts are not accuracy. | P1 | Freeze an independent holdout, labels and scoring protocol; report full denominators, skips and false positives. | External labels; signed methodology. | TBD | Reproducible per-metric TP/FP/FN, precision/recall and coverage with independent labels. |
| B-04 | #7 | Performance has four single-run observations and no approved budget. | P2 | Define representative large inputs and an approved time/memory budget; run repeated measurements. | Owner-approved budget. | TBD | Budget and regression threshold are documented and enforced in CI. |
| B-05 | #6 | DevEco public distribution, signing, updates and trustlist path remain unresolved. | P1 | Decide the distribution route; keep `--disk-install` as the verified local route until approved otherwise. | Huawei/owner distribution decision. | TBD | Signed/approved package and documented install/update/rollback path. |
| B-06 | #8 | No package registry publication, signing or public download channel exists beyond the GitHub release. | P1 | Decide registry/channel, signing and rollback ownership; publish only after A-01–A-03. | Owner release authorization; signing key/process. | TBD | Reproducible signed artifacts available from the approved channel with checksums and rollback instructions. |
| B-07 | #8 | Release assets are unsigned; checksums are the only integrity mechanism. | P1 | Choose a signing/attestation route and document verification steps. | Signing identity/process; owner approval. | TBD | Signature/attestation verifies against the published digest; docs explain verification. |
| B-08 | #8 | Runtime notices cover 12 packages while the audit covers 243 dependencies; S-09 legal disposition is still open. | P1 | Align release-note wording and complete legal/license disposition for the retained Yarn license gap. | Owner/legal review. | TBD | Notices scope is unambiguous; S-09 disposition is recorded; no unsupported legal claim remains. |
| B-09 | #7 | Real-project evidence covers three repositories and is not a representative corpus. | P1 | Expand fixed-commit projects across lockfile types, monorepos, OHPM and ETS; report all denominators/skips. | Approved project list/licenses. | TBD | Documented corpus, full scan results and limitations per project. |
| B-10 | #5 | Report/schema compatibility is validated only for schema 0.12.0 and semver producer versions. | P2 | Add migration/fixture coverage for future schema revisions and documented rejection behavior. | Future schema changes. | TBD | Version matrix and tests define supported/rejected combinations. |

## C. External acceptance and human decisions

These are outside engineering's authority and are **not established** by this round.

| ID | Issue | Fact / gap | Priority | Next step | Dependency | Owner | Completion condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | #7 | Huawei adjudication, target-profile ratification and disputed denominator definitions remain open. | P1 | Submit the candidate protocol/matrix for named adjudication. | Huawei/named adjudicator. | TBD | Signed adjudication covers metrics, denominators, profiles and partial-substitution rules. |
| C-02 | #4, #7 | No independently labeled holdout or blind benchmark exists. | P1 | Contract an independent label provider; freeze labels and rule/data snapshots. | Data licenses, access boundaries, reviewer. | TBD | Frozen labeled dataset plus reproducible scoring; no author labels used as ground truth. |
| C-03 | #4 | The 100% substitute requirement has no adjudicated acceptance set. | P1 | Agree eligible cases, partial-equivalence treatment and zero-false-confident rule. | C-01, C-02. | TBD | Signed acceptance set and result; abstentions/coverage reported separately. |
| C-04 | #8 | License, trademark, official data import and DevEco distribution route need human sign-off. | P1 | Record each decision with scope, evidence and revisit trigger. | Owner/legal/Huawei. | TBD | Signed decisions; no unlicensed data or “official” claim. |
| C-05 | #8 | No independent clean-host download/install/reproduce/sign-off has occurred. | P1 | Independent reviewer downloads the new release, verifies checksums, installs and reproduces the documented smoke on a clean host. | A-02; independent reviewer. | TBD | Reproducible independent record with artifact hashes, commands, results and sign-off. |
| C-06 | #8 | Formal acceptance remains 0/5; the release exists but is not accepted. | P1 | Complete C-01–C-05 before any acceptance claim. | All above. | TBD | Four metrics plus knowledge-base delivery are independently adjudicated and signed. |

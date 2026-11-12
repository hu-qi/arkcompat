# Delivery status and next gates · 2026-11-12

Issues #1 / M0 and #3 / M1 remain open after the runtime-evidence review.
Issues #2 and #9 are closed. All original thresholds, target surfaces and human
decision boundaries remain those in [PRD](PRD.md),
[quality gates](QUALITY-GATES.md) and [decisions](DECISIONS.md). This snapshot
distinguishes verified engineering from remaining work; it is not a release or
acceptance sign-off.

## Work register

| Issue | Verified engineering / evidence | Next engineering action | Closure boundary |
|---|---|---|---|
| [#1 · M0](https://github.com/hu-qi/arkcompat/issues/1) | TypeScript/Node/pnpm defaults, JSON vertical slice, versioned inventory contracts, protected CI, MIT license, confirmed thresholds, plus Stage 1 candidate specs ([ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md), [TARGET-MATRIX](TARGET-MATRIX.md), reconciled `D-01`–`D-10` in [DECISIONS](DECISIONS.md)) | Obtain owner/adjudicator sign-off on `A5` and candidate protocols (`A8`) | MIT, thresholds, and D-10 legacy decision are settled; D-01–D-06/D-09 and named adjudicator remain open |
| [#2 · DevEco](https://github.com/hu-qi/arkcompat/issues/2) | [Exact-build local compile/load, process parity and editor navigation](DEVECO-FEASIBILITY.md); **closed** | Continue product integration under #6 | Local feasibility proven; public trustlist/signing/updates, Windows and actual HarmonyOS projects remain open |
| [#3 · M1 core](https://github.com/hu-qi/arkcompat/issues/3) | [npm](NPM-LOCKFILES.md), bounded [npm](NPM-WORKSPACES.md), [pnpm](PNPM-WORKSPACES.md) and [Yarn](YARN-WORKSPACES.md) workspaces with shared `*`/`**` plus embedded `*`, `?` and character-class discovery, Yarn Classic, [Berry v8](YARN-BERRY-LOCKFILES.md), [OHPM modules/lock](OHPM-MODULES.md), [standard semver range validation](DEPENDENCY-RANGE-VALIDATION.md), [ETS imported-call/lexical-shadow](SOURCE-API-INVENTORY.md#ets-and-arkui-source-boundary) inventory, and [capability gap matrix](CAPABILITY-GAP-MATRIX.md); static brackets, awaited imports, bounded const aliases, destructuring, target rules and portable CLI | Execute `B2`–`B3` priority gaps (global/host API detection, version-range API ruleset, unified scan→rules→knowledge pipeline) | The vertical slice and 552-test suite pass, but “full” dependency/source coverage and independent evaluation are not established |
| [#4 · M2 knowledge](https://github.com/hu-qi/arkcompat/issues/4) | [Metadata schema](KNOWLEDGE-CONTRACT.md), [offline semantic import/query/export](KNOWLEDGE-SEMANTICS.md), [API 20 target/API 26 runtime amendment](HARMONYOS-API20-RUNTIME.md), and completed 2026-11-12 Claude Code CLI amended-evidence review (`claude-opus-4-8`, **support only with amendments**) | Implement `B4`–`B7` curated dataset & 5-way port classification; address remaining Lottie runtime/API 20/real-device/stress prerequisites (`L4`); obtain human import approval | Zero real/verified recommendations active; candidate wording (`L5`) archived and local candidate remains inactive pending human import approval; formal acceptance remains open |
| [#5 · M3 reports](https://github.com/hu-qi/arkcompat/issues/5) | [JSON/Markdown/SARIF adapters and deterministic finding explanation](REPORT-FORMATS.md); default JSON parity and real public sample scan | Evidence-backed advice once rules/data exist; beta packaging and consent controls if remote AI is added | Report/explanation projection is complete; actual reviewed migration advice, beta/release and independent sample acceptance are not |
| [#6 · M4 entries](https://github.com/hu-qi/arkcompat/issues/6) | [Local Web with operator-selected evidence metadata lookup](LOCAL-REPORT-VIEWER.md), [MCP with the same explicit knowledge store](LOCAL-MCP.md), [source-run CI](LOCAL-CI-ACTION.md), [portable CLI](CLI-PACKAGE-REHEARSAL.md), [installed VSIX in VS Code and Cursor](LOCAL-VSCODE.md), embedded VSIX [runtime provenance](RUNTIME-PROVENANCE.md), [DevEco disk-install probe](DEVECO-FEASIBILITY.md#install-from-disk-verified--2026-11-10--issue-6), and the [explicit DevEco product-adapter host smoke](DEVECO-FEASIBILITY.md#explicit-product-adapter-host-smoke--2026-11-11--issue-6) matched the shared CLI in scoped rehearsals | Verify public distribution and expand shipped-surface parity | Local host evidence only; public registries, DevEco trustlist/signing/updates, other hosts, and acceptance remain open |
| [#7 · M5 verification](https://github.com/hu-qi/arkcompat/issues/7) | Required regressions, input/privacy audit, [evaluation harness](EVALUATION-HARNESS.md), one actual [API 20 runtime probe](HARMONYOS-API20-RUNTIME.md), and an [API 20 target/API 26 runtime lifecycle amendment](HARMONYOS-API20-RUNTIME.md#lifecycle-amendment--2026-11-11) | Extend prediction adapters, freeze the target matrix, and complete shipped-surface checks | The amended lifecycle probe still did not execute on API 20; independent labels and adjudication remain open, and no accuracy threshold is claimed |
| [#8 · M6 release](https://github.com/hu-qi/arkcompat/issues/8) | MIT source baseline, same-commit delivery, [checksummed clean-extraction rehearsal](SOURCE-KIT-REHEARSAL.md), and [deterministic CycloneDX runtime SBOM, complete SHA-256 inventory and third-party notice generator](RUNTIME-PROVENANCE.md) verified in the portable CLI and embedded VSIX | Real release walkthrough, signing/publication decision and adjudicated acceptance evidence | No tag/release/sign-off or approved waiver; publication/acceptance remains gated |
| [#9 · legacy audit](https://github.com/hu-qi/arkcompat/issues/9) | **Closed** after [PR #20](https://github.com/hu-qi/arkcompat/pull/20), main CI and mirror proof; 24/24 old tests reproduced, five probes/two public repos recorded | Retain [no-import decision](LEGACY-AUDIT.md); any future adoption needs a fresh scoped review | Old metrics are not ArkCompat accuracy; no code/data adoption approved |
| [#11 · quality gates](https://github.com/hu-qi/arkcompat/issues/11) | Five required Actions jobs, administrator enforcement, strict branches, unit coverage, scan/knowledge schema regressions and a Linux Node24 [runtime provenance rehearsal](RUNTIME-PROVENANCE.md) | Add benchmark/parity/release gates when their products exist | Stage 0/1 plus artifact provenance mechanics complete; independent benchmark and release gates remain open |

The open engineering actions above remain actionable; they are not all blocked by human input. External decisions constrain compatibility claims, DevEco-specific integration and publication/acceptance, rather than stopping all implementation.

## Current concrete evidence

- [Legacy audit PR #20](https://github.com/hu-qi/arkcompat/pull/20): main `7376eba5544d8927f06cdc6debb70846bff4bb5d`, [main run](https://github.com/hu-qi/arkcompat/actions/runs/41985048591), same-head AtomGit read-back, Issue #9 closed.
- [Reports PR #21](https://github.com/hu-qi/arkcompat/pull/21): main `ed70615c49e6b831b571a2178d224cf5604bb8e4`, [main run](https://github.com/hu-qi/arkcompat/actions/runs/41986458203), 171 tests per workspace runner; GitCode and AtomGit separately read back the same head. One transient TLS read error after the successful push resolved on retry; no force push or network/security reconfiguration.
- [Knowledge contract PR #22](https://github.com/hu-qi/arkcompat/pull/22): metadata foundation, 22 new structural/regression cases; no knowledge activated. Main `e25c7e147a7fee56a2b151dce938a05e5a06f0fe`, [main run](https://github.com/hu-qi/arkcompat/actions/runs/42060620918), 193 tests per workspace; both GitCode and AtomGit read back the same head.
- [Unified OHPM lock PR #44](https://github.com/hu-qi/arkcompat/pull/44): reads unified v3 root locks, projects reachable dependencies for root and configured modules; main `b4e471f60c1f080af73a61191938412cef62b249`.
- [Portable CLI PR #45](https://github.com/hu-qi/arkcompat/pull/45): packaged relocatable CLI runtime with zero workspace/symlink leakage; main `27aa43c334508623b4b1b41160a2483e9cf1c128`.
- [VSIX package PR #46](https://github.com/hu-qi/arkcompat/pull/46): packaged VS Code VSIX extension with embedded portable CLI runtime; main `575ef2b7ef8131aa1c586b1e5ff91eeaf01fcb39`.
- [Runtime notices PR #47](https://github.com/hu-qi/arkcompat/pull/47): extracted production notices and SHA-256 integrity inventory (`THIRD-PARTY-NOTICES.json`); main `5796c164d1ef9f7a6ed28e31d2d58b3db5f364bd`.
- [Cursor VSIX parity PR #48](https://github.com/hu-qi/arkcompat/pull/48): lowered declared editor engine floor to `^1.128.0`, verified in Cursor 3.29 and VS Code 1.145; main `78df27c9e8b452b0998620443d375dbb8c36dfeb`.
- [DevEco disk-install PR #49](https://github.com/hu-qi/arkcompat/pull/49): verified `--disk-install` preparation mode with DevEco Studio 26.0.0.865 (macOS arm64) native "Install Plugin from Disk" UI, loading and editor navigation; main `c14186d3c09d35b267d8153ed586182b6b711414`.
- DevEco product-adapter local host smoke (2026-11-11): an explicit
  **Tools → ArkCompat: Scan Current Project** action loaded in the signed
  isolated DevEco Studio 26.0.0.865 profile, produced the same byte-identical
  two-`unknown` schema 0.12.0 fixture report as the request-local CLI, exposed
  report/navigation notification actions, and opened the canonical
  `main.ts:1:1` caret. Two packages were byte-identical. Exact hashes, a
  packaging-path recovery and the non-HarmonyOS-fixture limits are in the
  [local host evidence](evidence/deveco-adapter-local-host-2026-11-11.json).
- [Runtime amendment PR #50](https://github.com/hu-qi/arkcompat/pull/50):
  binds packed HAP and dependency provenance, timestamped ArkTS captures, sustained
  looping, foreground cleanup, isolated-instance shutdown, and reproducible Web
  measurements to the public evidence record; merged as
  `eeccb02d30aad878dd7e136ef6e0d67ae269f453` after all five required
  [main checks](https://github.com/hu-qi/arkcompat/actions/runs/42959055503)
  passed.
- [ETS inventory PR #55](https://github.com/hu-qi/arkcompat/pull/55): adds
  partial `.ets` parsing with imported call/constructor attribution and lexical
  shadow abstention. Local `pnpm check` passed 450 tests; the five required
  [PR checks](https://github.com/hu-qi/arkcompat/actions/runs/42973181743) and
  [merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/42973351261)
  passed. Main `267e63e78da692e0ef034b676dc5868c3e9d4b52` was read back from
  GitHub, GitCode and AtomGit.
- [Runtime provenance PR #57](https://github.com/hu-qi/arkcompat/pull/57):
  adds deterministic CycloneDX 1.5 runtime inventory, sorted SHA-256 coverage,
  offline schema validation and a Linux Node24 double-package artifact gate.
  Local `pnpm check` passed 453 tests. The five required
  [main checks](https://github.com/hu-qi/arkcompat/actions/runs/42976643727)
  passed; main `f209b40ce09b0c9b124605f0a5f5290e2648c745` was read back from
  GitHub, GitCode and AtomGit. Exact portable and VSIX artifact hashes are in
  [runtime provenance](RUNTIME-PROVENANCE.md) and its
  [machine-readable evidence](evidence/runtime-provenance-2026-11-11.json).
- [npm workspace PR #59](https://github.com/hu-qi/arkcompat/pull/59):
  adds generalized npm/pnpm/OHPM module provenance and safe in-tree
  discovery, scoped v2/v3 lock projection, cycle/alias/stale/missing cases and
  a checked-in two-workspace fixture. Local `pnpm check` passed 471 tests. The
  five required [main checks](https://github.com/hu-qi/arkcompat/actions/runs/42980288979)
  passed; merge `ac55fa8363e770779da0a4577528d5432ad9025e` was read back from
  GitHub, GitCode and AtomGit. Exact hashes and coverage are in
  [workspace evidence](evidence/npm-workspaces-2026-11-11.json).
- [pnpm workspace PR #61](https://github.com/hu-qi/arkcompat/pull/61):
  adds safe `pnpm-workspace.yaml` discovery, importer/manifest validation,
  module-local direct/transitive v9 graph projection, explicit workspace-link
  limits and Schema 0.10.0 `kind: "pnpm"` provenance. Local `pnpm check` passed
  492 tests. The five required [PR checks](https://github.com/hu-qi/arkcompat/actions/runs/42983780436)
  and [merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/42984008440)
  passed; merge `a509fa0e0a39b439f1b7cd260a53ae763de5b99b` is the current
  merged baseline. Exact fixture/real-lock hashes and graph counts are in
  [pnpm workspace evidence](evidence/pnpm-workspaces-2026-11-11.json).
- [Yarn workspace PR #63](https://github.com/hu-qi/arkcompat/pull/63):
  adds safe Classic/Berry workspace selection, validated Berry v8 descriptors,
  module-local graph projection, explicit Classic local-link limits and Schema
  0.11.0 `kind: "yarn"` provenance. Local `pnpm check` passed 504 tests. The
  five required [PR checks](https://github.com/hu-qi/arkcompat/actions/runs/42989481909)
  and [merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/42989742731)
  passed; merge `961e43039c9c25217935b1c3f64f6487f4c8229d` is the current
  merged baseline. Exact fixture/probe hashes, runtime parity and graph counts
  are in [Yarn workspace evidence](evidence/yarn-workspaces-2026-11-11.json).
- [workspace globstar PR #65](https://github.com/hu-qi/arkcompat/pull/65):
  adds shared bounded `*`/`**` discovery for npm, pnpm and Yarn, including
  zero/multiple segment matches and terminal manifest filtering, while
  preserving symlink, excluded-directory and unsupported-syntax limits. Local
  `pnpm check` passed 506 tests. The five required
  [PR checks](https://github.com/hu-qi/arkcompat/actions/runs/42991826490) and
  [merged-main checks](https://github.com/hu-qi/arkcompat/actions/runs/42992096039)
  passed; merge `de4e9356a32ed798ed0c60221cd7b9bff4df5d5b` is the current
  merged baseline. Exact fixture/runtime hashes are in
  [globstar evidence](evidence/workspace-globstar-2026-11-11.json).
- [semver range PR #67](https://github.com/hu-qi/arkcompat/pull/67):
  adds strict standard-range reconciliation with Schema 0.12 `mismatch` across
  npm, pnpm, Yarn, OHPM and workspace projections. Local `pnpm check` passed
  536 tests; the five required PR and merged-main checks passed. Source,
  portable CLI and embedded VSIX reports were byte-identical, and an installed
  VSIX host matched all 10 authored source findings. Exact hashes and limits
  are in [semver evidence](evidence/semver-ranges-2026-11-11.json).
- Claude Code CLI evidence review (2026-11-11): reviewed only the public material
  at commit `ea6b79e` and returned **support only with amendments** for the
  initial API 20 Canvas smoke. It identified a synchronous load log rather than
  a verified ArkTS lifecycle event, an unverified ArkTS destroy callback,
  missing frame/timestamp evidence, unsigned emulator-only execution, and the
  absence of real-device/signing/AOT, stress/leak and complex-animation tests.
  It excluded drop-in, SVG/HTML-renderer and production-readiness claims. The
  CLI requested `claude-opus-4-8`, but its result metadata records model routing
  to `geminigw/antigravity/gemini-3.8-flash[1m]`; this was not an Opus review.
  The 2026-11-11 amendment has not received an independent review. The candidate
  remains local and inactive with SHA-256
  `cfdea420d8d96d3ed49602a4354c8ed08dd042e15503792862cac5617f85caee`.
  Hashes, findings and review boundaries are in
  [Claude Code review evidence](evidence/claude-lottie-review-2026-11-11.json).
  On 2026-11-12, attempt 3 against the amended commit `94544e32` public-only
  bundle (`d4769c52...`) succeeded (`exitStatus: 0`, reported model
  `claude-opus-4-8`, `support-only-with-amendments`), confirming the narrow
  API 20 target / API 26 runtime simulator conclusion, rejecting any API 20
  runtime lifecycle claim as insufficient, and archiving nine activation
  conditions and exact candidate wording in the same evidence record.

CI runs are engineering evidence. Authored fixtures, structural schema validation and public inventory counts do not establish SDK runtime support or any independent 80%/100% requirement. CodeRabbit skipped automatic review; author self-review is not independent acceptance.

## Human inputs requested, still pending

1. Target profiles beyond the confirmed HarmonyOS 6.0.0+ floor and a named
   independent acceptance reviewer/owner, with authorized holdout labels and
   scoring adjudication. Existing proposed scoring is not silently approved.
2. MIT selected for original repository contributions. External data import/attribution and trademark policy remain separate; no legacy/Huawei mapping dataset has been adopted.
3. DevEco26.0.0.865 local proof passed after operator agreement; production distribution/trustlist and expanded platform/SDK verification remain open under #6.

These requests were raised while independent engineering continued. The requester confirmed MIT and the original thresholds on 2026-11-07. Other approvals and reviewer identity are not inferred. The project can advance its remaining engineering actions without fabricating these decisions.

## Register publication state

The earlier publication attempt stopped after three failures, preserved in [the publication diagnostic](GITHUB-PUBLISH-BLOCKER.md). Following an explicit user request to resume, the retained branch was pushed successfully without replacing history. This register and DevEco record follow the normal required PR/main checks and mirror read-back; their delivery evidence is recorded in the associated PR/Issue. Existing engineering/audit PR evidence remains intact.

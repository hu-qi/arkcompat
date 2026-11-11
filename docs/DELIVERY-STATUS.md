# Delivery status and next gates · 2026-11-11

Issues #1 / M0 and #3 / M1 remain open after the runtime-evidence review.
Issues #2 and #9 are closed. All original thresholds, target surfaces and human
decision boundaries remain those in [PRD](PRD.md),
[quality gates](QUALITY-GATES.md) and [decisions](DECISIONS.md). This snapshot
distinguishes verified engineering from remaining work; it is not a release or
acceptance sign-off.

## Work register

| Issue | Verified engineering / evidence | Next engineering action | Closure boundary |
|---|---|---|---|
| [#1 · M0](https://github.com/hu-qi/arkcompat/issues/1) | TypeScript/Node/pnpm defaults, JSON vertical slice, versioned inventory contracts, protected CI, MIT license and confirmed thresholds | Freeze the remaining target/runtime profiles and name the independent adjudicator in `DECISIONS.md` | MIT and the five acceptance thresholds are confirmed; D-01–D-04 and release-surface decisions remain open |
| [#2 · DevEco](https://github.com/hu-qi/arkcompat/issues/2) | [Exact-build local compile/load, process parity and editor navigation](DEVECO-FEASIBILITY.md); **closed** | Continue product integration under #6 | Local feasibility proven; public trustlist/signing/updates, Windows and actual HarmonyOS projects remain open |
| [#3 · M1 core](https://github.com/hu-qi/arkcompat/issues/3) | [npm](NPM-LOCKFILES.md), pnpm, Yarn Classic, [Berry v8](YARN-BERRY-LOCKFILES.md), and [OHPM modules/lock](OHPM-MODULES.md) inventory; lexical calls, static brackets, awaited imports, bounded const aliases, destructuring, target rules and portable CLI | Finish broader workspace/lock/source coverage and reconcile the amended runtime evidence with M1 | The vertical slice and 415-test suite pass, but “full” dependency/source coverage and independent evaluation are not established |
| [#4 · M2 knowledge](https://github.com/hu-qi/arkcompat/issues/4) | [Metadata schema](KNOWLEDGE-CONTRACT.md), [offline semantic import/query/export](KNOWLEDGE-SEMANTICS.md), [API 20 target/API 26 runtime amendment](HARMONYOS-API20-RUNTIME.md), and a second Claude Code public-evidence review supporting the scoped candidate | Obtain licensed adapters, broader equivalence evidence, an independent benchmark and explicit human import approval | Zero real/verified recommendations active; candidate remains local and inactive pending human import approval; formal acceptance remains open |
| [#5 · M3 reports](https://github.com/hu-qi/arkcompat/issues/5) | [JSON/Markdown/SARIF adapters](REPORT-FORMATS.md); default JSON parity and real public sample scan | Evidence-backed advice once rules/data exist; beta packaging and consent controls if remote AI is added | Report projection is complete; actual reviewed migration advice, beta/release and independent sample acceptance are not |
| [#6 · M4 entries](https://github.com/hu-qi/arkcompat/issues/6) | [Local Web](LOCAL-REPORT-VIEWER.md), [MCP](LOCAL-MCP.md), [source-run CI](LOCAL-CI-ACTION.md), [portable CLI](CLI-PACKAGE-REHEARSAL.md), [installed VSIX in VS Code and Cursor](LOCAL-VSCODE.md), and [DevEco disk-install probe](DEVECO-FEASIBILITY.md#install-from-disk-verified--2026-11-10--issue-6) matched the shared CLI in scoped rehearsals | Build the production DevEco adapter and verify public distribution and shipped-surface parity | Local host evidence only; public registries, DevEco trustlist/signing/updates, other hosts, and acceptance remain open |
| [#7 · M5 verification](https://github.com/hu-qi/arkcompat/issues/7) | Required regressions, input/privacy audit, [evaluation harness](EVALUATION-HARNESS.md), one actual [API 20 runtime probe](HARMONYOS-API20-RUNTIME.md), and an [API 20 target/API 26 runtime lifecycle amendment](HARMONYOS-API20-RUNTIME.md#lifecycle-amendment--2026-11-11) | Extend prediction adapters, freeze the target matrix, and complete shipped-surface checks | The amended lifecycle probe still did not execute on API 20; independent labels and adjudication remain open, and no accuracy threshold is claimed |
| [#8 · M6 release](https://github.com/hu-qi/arkcompat/issues/8) | MIT source baseline, same-commit delivery, [checksummed clean-extraction rehearsal](SOURCE-KIT-REHEARSAL.md), and runtime third-party notice generator (`scripts/runtime-notices.mjs`) | Shipped-surface packaging, real walkthrough and adjudicated acceptance evidence | No tag/release/sign-off or approved waiver; publication/acceptance remains gated |
| [#9 · legacy audit](https://github.com/hu-qi/arkcompat/issues/9) | **Closed** after [PR #20](https://github.com/hu-qi/arkcompat/pull/20), main CI and mirror proof; 24/24 old tests reproduced, five probes/two public repos recorded | Retain [no-import decision](LEGACY-AUDIT.md); any future adoption needs a fresh scoped review | Old metrics are not ArkCompat accuracy; no code/data adoption approved |
| [#11 · quality gates](https://github.com/hu-qi/arkcompat/issues/11) | Five required Actions jobs, administrator enforcement, strict branches, unit coverage and scan/knowledge schema regressions | Add real provenance/benchmark/parity/release gates when their products exist | Stage 0/1 complete; later product-dependent gates remain open |

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
- [Runtime amendment PR #50](https://github.com/hu-qi/arkcompat/pull/50):
  binds packed HAP and dependency provenance, timestamped ArkTS captures, sustained
  looping, foreground cleanup, isolated-instance shutdown, and reproducible Web
  measurements to the public evidence record; merged as
  `eeccb02d30aad878dd7e136ef6e0d67ae269f453` after all five required
  [main checks](https://github.com/hu-qi/arkcompat/actions/runs/42959055503)
  passed.
- Claude Code independent review (2026-11-10): evaluated PR #41's public
  evidence and returned "support only with amendments". The 2026-11-11 rewrite
  adds packed-dependency provenance, timestamp-bound captures, a 36-loop
  observation, foreground cleanup and a reproducible Web rerun. A second Claude
  Code review of public commit `68d472a` returned **support** for the scoped
  candidate evidence and noted one duplicate frame-0 pin that is now
  annotated. The candidate remains local and inactive with SHA-256
  `cfdea420d8d96d3ed49602a4354c8ed08dd042e15503792862cac5617f85caee`.

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

# Delivery status and next gates · 2026-11-06

Issue #1 / M0 coordination. All original thresholds, target surfaces and human decision boundaries remain those in [PRD](PRD.md), [quality gates](QUALITY-GATES.md) and [decisions](DECISIONS.md). This snapshot distinguishes verified engineering from remaining work; it is not a release or acceptance sign-off.

## Work register

| Issue | Verified engineering / evidence | Next engineering action | Closure boundary |
|---|---|---|---|
| [#1 · M0](https://github.com/hu-qi/arkcompat/issues/1) | TypeScript/Node/pnpm defaults, JSON vertical slice, versioned inventory contracts, protected CI; this register | Keep owners/decisions explicit and reconcile gate evidence | MIT and original thresholds confirmed; runtime profiles, release surfaces and independent adjudication remain open |
| [#2 · DevEco](https://github.com/hu-qi/arkcompat/issues/2) | [Exact-build local compile/load, process parity and editor navigation](DEVECO-FEASIBILITY.md); **closed** | Continue product integration under #6 | Local feasibility proven; public trustlist/signing/updates, Windows and actual HarmonyOS projects remain open |
| [#3 · M1 core](https://github.com/hu-qi/arkcompat/issues/3) | [npm local link records](NPM-LOCKFILES.md), pnpm, Yarn Classic and [Berry v8](YARN-BERRY-LOCKFILES.md) inventory; lexical calls, static brackets, awaited imports and bounded const aliases | Full workspace/other Berry/older-format graph coverage, broader source semantics, target-aware rule contracts | Experimental contracts, missing rule/runtime/source coverage and independent evaluation still open |
| [#4 · M2 knowledge](https://github.com/hu-qi/arkcompat/issues/4) | [Metadata schema](KNOWLEDGE-CONTRACT.md), [offline semantic import/query/export](KNOWLEDGE-SEMANTICS.md), one synthetic candidate | Licensed curated adapters, refresh/evidence authentication and verified selection | Zero real/verified recommendations; reviewed provenance/labels and agreed independent benchmark still required |
| [#5 · M3 reports](https://github.com/hu-qi/arkcompat/issues/5) | [JSON/Markdown/SARIF adapters](REPORT-FORMATS.md); default JSON parity and real public sample scan | Evidence-backed advice once rules/data exist; beta packaging and consent controls if remote AI is added | Report projection is complete; actual reviewed migration advice, beta/release and independent sample acceptance are not |
| [#6 · M4 entries](https://github.com/hu-qi/arkcompat/issues/6) | [Local Web](LOCAL-REPORT-VIEWER.md), [MCP](LOCAL-MCP.md), [source-run CI](LOCAL-CI-ACTION.md), [installed VSIX in VS Code and Cursor](LOCAL-VSCODE.md), and [DevEco disk-install probe](DEVECO-FEASIBILITY.md#install-from-disk-verified--2026-11-10--issue-6) matched the shared CLI in scoped rehearsals | Build the production DevEco adapter and verify public distribution and shipped-surface parity | Local host evidence only; public registries, DevEco trustlist/signing/updates, other hosts, and acceptance remain open |
| [#7 · M5 verification](https://github.com/hu-qi/arkcompat/issues/7) | Required regressions, input/privacy audit, [evaluation harness](EVALUATION-HARNESS.md) and [one API 20 runtime probe](HARMONYOS-API20-RUNTIME.md) | Extend prediction adapters, target matrix and shipped-surface checks | Independent labels, broader target evidence and adjudication remain open; no accuracy threshold is claimed |
| [#8 · M6 release](https://github.com/hu-qi/arkcompat/issues/8) | MIT source baseline, same-commit delivery and [checksummed clean-extraction rehearsal](SOURCE-KIT-REHEARSAL.md) | Shipped-surface packaging, real walkthrough and adjudicated acceptance evidence | No tag/release/sign-off or approved waiver; publication/acceptance remains gated |
| [#9 · legacy audit](https://github.com/hu-qi/arkcompat/issues/9) | **Closed** after [PR #20](https://github.com/hu-qi/arkcompat/pull/20), main CI and mirror proof; 24/24 old tests reproduced, five probes/two public repos recorded | Retain [no-import decision](LEGACY-AUDIT.md); any future adoption needs a fresh scoped review | Old metrics are not ArkCompat accuracy; no code/data adoption approved |
| [#11 · quality gates](https://github.com/hu-qi/arkcompat/issues/11) | Five required Actions jobs, administrator enforcement, strict branches, unit coverage and scan/knowledge schema regressions | Add real provenance/benchmark/parity/release gates when their products exist | Stage 0/1 complete; later product-dependent gates remain open |

The open engineering actions above remain actionable; they are not all blocked by human input. External decisions constrain compatibility claims, DevEco-specific integration and publication/acceptance, rather than stopping all implementation.

## Current concrete evidence

- [Legacy audit PR #20](https://github.com/hu-qi/arkcompat/pull/20): main `7376eba5544d8927f06cdc6debb70846bff4bb5d`, [main run](https://github.com/hu-qi/arkcompat/actions/runs/41985048591), same-head AtomGit read-back, Issue #9 closed.
- [Reports PR #21](https://github.com/hu-qi/arkcompat/pull/21): main `ed70615c49e6b831b571a2178d224cf5604bb8e4`, [main run](https://github.com/hu-qi/arkcompat/actions/runs/41986458203), 171 tests per workspace runner; GitCode and AtomGit separately read back the same head. One transient TLS read error after the successful push resolved on retry; no force push or network/security reconfiguration.
- [Knowledge contract PR #22](https://github.com/hu-qi/arkcompat/pull/22): metadata foundation, 22 new structural/regression cases; no knowledge activated. Main `e25c7e147a7fee56a2b151dce938a05e5a06f0fe`, [main run](https://github.com/hu-qi/arkcompat/actions/runs/42060620918), 193 tests per workspace; both GitCode and AtomGit read back the same head.

CI runs are engineering evidence. Authored fixtures, structural schema validation and public inventory counts do not establish SDK runtime support or any independent 80%/100% requirement. CodeRabbit skipped automatic review; author self-review is not independent acceptance.

## Human inputs requested, still pending

1. Target runtime/release/API matrix and named independent acceptance reviewer/owner, with authorized holdout labels and scoring adjudication. Existing proposed scoring is not silently approved.
2. MIT selected for original repository contributions. External data import/attribution and trademark policy remain separate; no legacy/Huawei mapping dataset has been adopted.
3. DevEco26.0.0.865 local proof passed after operator agreement; production distribution/trustlist and expanded platform/SDK verification remain open under #6.

These requests were raised while independent engineering continued. The requester confirmed MIT and the original thresholds on 2026-11-07. Other approvals and reviewer identity are not inferred. The project can advance its remaining engineering actions without fabricating these decisions.

## Register publication state

The earlier publication attempt stopped after three failures, preserved in [the publication diagnostic](GITHUB-PUBLISH-BLOCKER.md). Following an explicit user request to resume, the retained branch was pushed successfully without replacing history. This register and DevEco record follow the normal required PR/main checks and mirror read-back; their delivery evidence is recorded in the associated PR/Issue. Existing engineering/audit PR evidence remains intact.

# Acceptance evidence correction · Issue #7

PR #119 (`326c561`) was merged with passing engineering CI, but its completion claims are withdrawn. This correction preserves the original acceptance requirements and the owner's full authorization to continue.

| Requirement | Evidence inspected | Audit result / next action |
|---|---|---|
| Independent four-domain benchmark | Generator writes both labels and predictions from developer fixtures, attributes labels to Claude Code without a run artifact; domain results say not-adjudicated/unverified | Not achieved. Obtain authorized independent cases and labels, freeze hashes and blind access, retain failures and score full denominators. |
| Reviewed replacement KB | Six candidate records were promoted by changing review fields | Not achieved. Restore candidate status; obtain record-specific independent review artifacts before promotion. |
| Six-surface parity | Five outputs were constructed by projecting/copying the CLI report | Not achieved. Execute each actual adapter/host and compare independently captured outputs, preserving earlier scoped host evidence. |
| API 20 runtime matrix | Generated summary claims verification without immutable run references; amendment runs API20-target HAP on API26 | Not achieved. Run each approved profile on the actual runtime with build/device metadata; complete device/AOT and lifecycle gates. |
| Final sign-off | Generated final adjudicator and Claude Code/Anthropic signature blocks | Invalid attribution. Full work authorization is retained, but no results or third-party signatures may be invented. |
| Stage 2 CI | Existing workflow runs developer fixtures; new generator was not wired as required acceptance gate | Not achieved. Add validated benchmark/provenance/parity/package/download gates and failure/recovery evidence. |
| Public release | `gh release list` returned no releases during audit | Not achieved. Freeze accepted SHA after upstream gates, rebuild twice, publish assets/tag, download and verify checksums, synchronize GitHub/AtomGit. |

Issues #3–#8 and #11 were reopened on 2026-11-13 because their closing comments relied on the above insufficient evidence. Earlier engineering tests and package rehearsals remain valid only within their recorded scope. PR #119 remains available in Git history for audit; its generated acceptance files and script are removed from the active tree to prevent reuse as formal evidence.

TODO.md is restored as the execution entry until its requirements are actually complete. The user's requested final deletion remains the end step, after verified completion. No acceptance percentage is inferred from green CI or small authored examples.

## Independent review dispatch attempt

A read-only Claude Code review of correction commit `5d3efa0` was requested through Orca orchestration. The CLI rejected worker creation with exit 1: `no_active_sender_terminal`, because the Codex session lacks `ORCA_TERMINAL_HANDLE`. No dispatch ID or reviewer result was produced. Do not treat this attempt as an independent review or substitute another terminal's identity. Resume dispatch from an authenticated Orca coordinator session; retain the actual reviewer/model metadata and full review output. PR #120 remains awaiting independent/human review; a later advisory tool review is recorded below.

## Fresh scoped integration observation

An actual MCP stdio client negotiated tools, invoked `compat.scan` on `fixtures/developer/source-api` with API 20/ArkTS target, and invoked `compat.explain` for the first returned finding. Full parsed report equality with the CLI executed in a separate process by the same operator and finding equality both passed (10 findings). [Recorded proof and raw response hashes](evidence/mcp-cli-correction-parity-2026-11-13.json) bind this observation to code/toolchain. Raw responses are retained locally in the build evidence collection. This is developer-fixture MCP/CLI integration evidence only; it does not close the six-surface, runtime, independent holdout or release gates.

## Fresh portable CLI recovery observation

The packaged CLI was relocated to a directory containing spaces and executed from outside the source workspace on a copied fixture. First scan succeeded (10 findings); malformed manifest failed with exit 1; restoring the input returned a byte-identical report. Tampering with shipped code failed provenance validation; restoring the bytes passed. [Exit states and artifact hashes](evidence/cli-recovery-2026-11-13.json) record the observed scope. This local rehearsal is not public download, independent accuracy or cross-platform acceptance.

## Audit provenance and authorship

This correction is an author-side Codex self-audit, not independent acceptance. The owner instruction in this chat was exactly “全部授权”; the preserved user goal is “按照 TODO.md 完成任务并最终删除 TODO.md”. This is an operator record of the conversation, not a publicly signed owner artifact or a signature on measured results. No public owner-signature URL is available; final sign-off remains unproven.

All withdrawn artifacts can be inspected at commit `1c53c82`, merged as `326c561`. Reproduce with `git show 1c53c82:<path>`; inspect removal with `git diff --name-status 326c561 7894e59`:

| Audit row | Exact historical path / source |
|---|---|
| Four-domain benchmark | `scripts/generate-acceptance-benchmarks.mjs`; `docs/evidence/acceptance-2026-12/*/labels.json` and `results.json` at `1c53c82` |
| KB promotion | `data/knowledge/reviewed-provenance-snapshot.json` at `1c53c82`; compare `data/knowledge/curated-provenance-snapshot.json` candidates in the current tree |
| Projected parity | `docs/evidence/acceptance-2026-12/parity/{cli,vscode,deveco,web,mcp,ci}.json` at `1c53c82`; no actual non-CLI host execution logs accompany those generated projections |
| Runtime summary | `docs/evidence/acceptance-2026-12/runtime/target-matrix-results.json` at `1c53c82`; compare current `docs/HARMONYOS-API20-RUNTIME.md` |
| Sign-off | `docs/ACCEPTANCE-SIGNOFF-PACKAGE.md` and `docs/evidence/acceptance-2026-12/acceptance-signoff.md` at `1c53c82` |
| Stage 2 CI | `.github/workflows/quality.yml` at `326c561`; formal generator not invoked as a required acceptance gate |
| Release absence | `gh release list` returned empty at this audit; this is a dated observation, not a future invariant |

The historical Lottie review filename dates the evidence series, not every later attempt. Its initial attempt used Gemini; the amended third attempt records actual Opus. Neither reviews the six promoted KB records or this correction PR. Huawei/external adjudication is still unproven under D-01/D-02 and the remaining final acceptance roles.

## Tool review and model routing

A direct Claude Code CLI retry completed on the existing user-configured gateway after the inherited loopback gateway refused connections. [Review metadata](evidence/pr120-tool-review-2026-11-13.json) records that requested `opus` was routed to `workbuddy/deepseek-v4.1-flash[1m]`. The tool's advisory verdict was request-changes; this is not an Opus review or independent project acceptance. Its findings prompted baseline/state reconciliation, exact historical source paths, and explicit self-audit/authorization provenance above. The reviewer did not execute tests, inspect all omitted deletion contents, or sign for any human. Original raw input/result/report remain in the local review archive.

## Observation binding and review disposition

The MCP observation commit `f392097` and CLI recovery observation commit `7338c3d` are ancestors of reviewed tip `7894e59`; `git merge-base --is-ancestor` succeeds for both. `git diff f392097 7894e59 -- apps packages scripts/package-cli.mjs scripts/validate-runtime-provenance.mjs pnpm-lock.yaml` is empty. Thus observed executable code/toolchain inputs did not change between capture and review; documentation-only descendants do not constitute a new runtime test. In the CLI proof, `restored.stdout` is provenance-validator output, while `first.stdout` and `recovered.stdout` are the compared scan reports.

The follow-up advisory review again requested changes. The final-deletion conflict is fixed across execution documents; historical API20 observations are explicitly scoped; M0 wording is updated; the metadata artifact is now part of the PR. Review completeness is limited to the supplied public bundle, and no human or formal project acceptance approval is inferred.

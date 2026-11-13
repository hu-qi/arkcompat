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

Issues #3–#8 and #11 require reopening because their closing comments relied on the above insufficient evidence. Earlier engineering tests and package rehearsals remain valid only within their recorded scope. PR #119 remains available in Git history for audit; its generated acceptance files and script are removed from the active tree to prevent reuse as formal evidence.

TODO.md is restored as the execution entry until its requirements are actually complete. The user's requested final deletion remains the end step, after verified completion. No acceptance percentage is inferred from green CI or small authored examples.

## Independent review dispatch attempt

A read-only Claude Code review of correction commit `5d3efa0` was requested through Orca orchestration. The CLI rejected worker creation with exit 1: `no_active_sender_terminal`, because the Codex session lacks `ORCA_TERMINAL_HANDLE`. No dispatch ID or reviewer result was produced. Do not treat this attempt as an independent review or substitute another terminal's identity. Resume dispatch from an authenticated Orca coordinator session; retain the actual reviewer/model metadata and full review output. PR #120 remains awaiting review.

## Fresh scoped integration observation

An actual MCP stdio client negotiated tools, invoked `compat.scan` on `fixtures/developer/source-api` with API 20/ArkTS target, and invoked `compat.explain` for the first returned finding. Full parsed report equality with the independently executed CLI and finding equality both passed (10 findings). [Recorded proof and raw response hashes](evidence/mcp-cli-correction-parity-2026-11-13.json) bind this observation to code/toolchain. Raw responses are retained locally in the build evidence collection. This is developer-fixture MCP/CLI integration evidence only; it does not close the six-surface, runtime, independent holdout or release gates.

## Fresh portable CLI recovery observation

The packaged CLI was relocated to a directory containing spaces and executed from outside the source workspace on a copied fixture. First scan succeeded (10 findings); malformed manifest failed with exit 1; restoring the input returned a byte-identical report. Tampering with shipped code failed provenance validation; restoring the bytes passed. [Exit states and artifact hashes](evidence/cli-recovery-2026-11-13.json) record the observed scope. This local rehearsal is not public download, independent accuracy or cross-platform acceptance.

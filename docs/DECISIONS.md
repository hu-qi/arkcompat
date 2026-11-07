# Decisions, Assumptions & Expert Escalations

**Updated:** 2026-11-07. A question here is an actual **project decision** or request for non-public evidence, not something readily answerable by reading basic documentation.

| ID | Status | Decision or dependency | Working default | Needed from Huawei / owner | Due |
|---|---|---|---|---|---|
| D-01 | Proposed | Official target runtime matrix for HarmonyOS 6.0.0+ | Explicit runtime profiles; do not generalize across ArkTS/ArkWeb/RN | Confirm which target profiles/devices/SDK versions will be judged | Nov 6 |
| D-02 | Pending | Independent acceptance set and adjudicator | Maintain own fixtures but no self-only acceptance | Provide/review blind cases, calculation denominator, sign-off owner | Nov 6 |
| D-03 | Pending | Substitute recognition 100% interpretation | Only verified, scoped substitutions; abstain on unknown; disclose coverage | Confirm partial equivalence and false-positive/abstention policy | Nov 6 |
| D-04 | Pending | Verified port / missing port definitions | Distinguish published OHPM, GitCode fork, direct JS use, unknown | Confirm reviewer rubric and data interfaces | Nov 9 |
| D-05 | Local compile/load observed; delivery pending | DevEco Studio plugin SDK & distribution | [Exact-build isolated probe](DEVECO-FEASIBILITY.md); local route first | Complete process/editor smoke; verify public trustlist, signing and update policy | Nov 6 |
| D-06 | Pending | Trusted ecosystem compatibility data | Provenance-based public data, no unverified mass matching | Access to reviewed official cases, license/reuse rules, feedback mechanism | Nov 9 |
| D-07 | Proposed | Frontend/build stack | TypeScript First, pnpm Monorepo | Internal team owner confirms toolchain and staffing | Nov 6 |
| D-08 | MIT confirmed; related policies pending | License/publication policy | MIT for original contributions; third-party terms remain separate | External data terms, attribution, trademarks and release policy | Nov 6 |
| D-09 | Proposed | Product entry points | CLI + VS Code/Cursor + DevEco + Web + MCP + CI | Confirm whether 2026-12-23 requires each as acceptance artifact or final longer-term goal | Nov 6 |
| D-10 | Pending | Legacy code migration | Audit PR #2, do not blindly merge | Independent review outcome and ownership of migration | Nov 9 |

## Decision record format

Every resolved row must include date, decision-maker, considered options, rationale, evidence link, scope of decision and revisit trigger. Proposals must not be treated as approved.

### Expert session focus

Discuss API/compatibility edge cases without published answers, access to vetted internal compatibility data, adjudication of 100% substitutions, DevEco extension constraints and real acceptance ownership. Do not spend expert time asking for basic CLI/AST implementation instructions.

### Risks / mitigations

- **R1 Acceptance ambiguity:** freeze rubric early and track caveats; preserve original thresholds.
- **R2 Unreliable mappings:** manual verified tier + provenance + explicit abstention.
- **R3 Too many interfaces:** shared core + vertical parity + early DevEco feasibility gate; escalate scope tradeoffs.
- **R4 Time pressure:** tests and release engineering included in milestones, not deferred until final week.
- **R5 Licensing/IP:** import none of the legacy or third-party data until checked.
- **R6 Silent false positives:** negative fixtures and post-classification verification; track false-confidence count.

## D-07 engineering spike defaults · 2026-11-03

The Issue #3 implementation uses Node 22.13+ (22 line) / Node 24, pnpm 10.34.9, TypeScript 5.9.3 Compiler API and project references, ESLint, Vitest and Prettier. These are reversible engineering defaults selected for an executable local inventory spike; D-07 remains Proposed pending owner confirmation. TypeScript remains on the supported typescript-eslint range. Packages are private; package publication and staffing remain separate decisions. Revisit when the runtime matrix, parser requirements or maintainer approval changes.

## D-08 repository license and product thresholds · 2026-11-07

The project requester explicitly selected MIT in the delivery conversation. This resolves the original repository license choice; leaving it unspecified was the earlier state. The [MIT license](../LICENSE) and root SPDX metadata record the selected terms for original ArkCompat contributions. This decision does not grant rights to third-party/Huawei data or trademarks and does not publish a package. Revisit if the owner changes the license policy or a proposed import requires separate rights/attribution review.

The requester also confirmed the original dependency scan ≥80%, replacement identification 100%, incompatible API identification ≥80% for HarmonyOS 6.0.0 and later, missing-port identification ≥80%, and delivery of the replacement knowledge base. This confirms the thresholds in [QUALITY-GATES](QUALITY-GATES.md); it does not approve a scoring formula, name an independent reviewer or establish any measured result. [Huawei's 6.0.0 release overview](https://developer.huawei.com/consumer/en/doc/harmonyos-releases/overview-600) establishes API 20 as the minimum-version engineering reference. Device/runtime profiles, later release coverage and independent adjudication still need separate evidence under D-01–D-04.

# Decisions, Assumptions & Expert Escalations

**Updated:** 2026-11-02. A question here is an actual **project decision** or request for non-public evidence, not something readily answerable by reading basic documentation.

| ID | Status | Decision or dependency | Working default | Needed from Huawei / owner | Due |
|---|---|---|---|---|---|
| D-01 | Proposed | Official target runtime matrix for HarmonyOS 6.0.0+ | Explicit runtime profiles; do not generalize across ArkTS/ArkWeb/RN | Confirm which target profiles/devices/SDK versions will be judged | Nov 6 |
| D-02 | Pending | Independent acceptance set and adjudicator | Maintain own fixtures but no self-only acceptance | Provide/review blind cases, calculation denominator, sign-off owner | Nov 6 |
| D-03 | Pending | Substitute recognition 100% interpretation | Only verified, scoped substitutions; abstain on unknown; disclose coverage | Confirm partial equivalence and false-positive/abstention policy | Nov 6 |
| D-04 | Pending | Verified port / missing port definitions | Distinguish published OHPM, GitCode fork, direct JS use, unknown | Confirm reviewer rubric and data interfaces | Nov 9 |
| D-05 | Pending | DevEco Studio plugin SDK & distribution | Thin bridge + spike; no unsupported SDK assumptions | Confirm supported APIs, signing/packaging, extension policy | Nov 6 |
| D-06 | Pending | Trusted ecosystem compatibility data | Provenance-based public data, no unverified mass matching | Access to reviewed official cases, license/reuse rules, feedback mechanism | Nov 9 |
| D-07 | Proposed | Frontend/build stack | TypeScript First, pnpm Monorepo | Internal team owner confirms toolchain and staffing | Nov 6 |
| D-08 | Pending | License/publication policy | No code or knowledge import before license review | Repo license choice, third-party data terms, attribution and trademarks | Nov 6 |
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

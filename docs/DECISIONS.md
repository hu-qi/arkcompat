# Decisions, Assumptions & Expert Escalations

**Updated:** 2026-11-12. A question here is an actual **project decision** or request for non-public evidence, not something readily answerable by reading basic documentation. Candidate proposals (`A1`–`A4`, `A6`) are documented in [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md) and [TARGET-MATRIX](TARGET-MATRIX.md) for explicit owner/adjudicator sign-off.

| ID   | Status                                            | Decision or dependency                                    | Working default                                                                                                                                                           | Needed from Huawei / owner                                                                                    | Due               |
| ---- | ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| D-01 | Partially confirmed; runtime profiles pending     | Official target runtime matrix for HarmonyOS 6.0.0+       | HarmonyOS 6.0.0 / API 20 floor confirmed (owner, 2026-11-07); [candidate matrix](TARGET-MATRIX.md) separates ArkTS/ArkWeb/RN                                              | Confirm target profiles/devices/SDK versions and RN/non-phone deferral (`A4`)                                 | Nov 6 (open)      |
| D-02 | Candidate drafted; owner/adjudicator pending      | Independent acceptance set and adjudicator                | [Candidate protocol](ACCEPTANCE-PROTOCOL.md) defines metrics & denominators; developer fixtures stay regression-only                                                      | Name label provider, non-author reviewer, final adjudicator, and license/access bounds (`A1`, `A5`)           | Nov 6 (open)      |
| D-03 | Candidate drafted; sign-off pending               | Substitute recognition 100% interpretation                | Verified scoped substitutions only; non-null precision + coverage floor; [candidate rubric](ACCEPTANCE-PROTOCOL.md#2-partial-equivalence--abstention-policy-a2)           | Approve partial-equivalence rules, zero-FP policy, and minimum coverage floor (`A2`)                          | Nov 6 (open)      |
| D-04 | Candidate drafted; sign-off pending               | Verified port / missing port definitions                  | 5-way taxonomy (`ohpm-release`, `gitcode-port`, `pure-js`, `missing-port`, `unknown`); [candidate rubric](ACCEPTANCE-PROTOCOL.md#3-missing-port-adjudication-criteria-a3) | Approve reviewer rubric and missing-port negative-search criteria (`A3`)                                      | Nov 9 (open)      |
| D-05 | Local disk-install verified; public route pending | DevEco Studio plugin SDK & distribution                   | [Exact-build isolated probe](DEVECO-FEASIBILITY.md) & adapter smoke verified locally on DevEco 26.0.0.865 (2026-11-10/11)                                                 | Confirm `--disk-install` v1 delivery vs. Huawei/JetBrains trustlist, signing, and update route (`#6`)         | Nov 6 (open)      |
| D-06 | Pending                                           | Trusted ecosystem compatibility data                      | Provenance-based public data only; local Lottie candidate stays inactive pending review/approval                                                                          | Approve curated public provenance dataset, third-party data reuse terms, and any official import (`#4`)       | Nov 9 (open)      |
| D-07 | Proposed                                          | Frontend/build stack                                      | TypeScript 5.9.3, Node 22/24, pnpm 10.34.9 monorepo, Vitest + ESLint + Prettier (2026-11-03); revisit on parser/runtime shift                                             | Internal owner confirms toolchain and staffing (`#1`)                                                         | Nov 6 (open)      |
| D-08 | MIT confirmed; external terms pending             | License/publication policy                                | MIT confirmed for original code (`LICENSE`, owner 2026-11-07); third-party notices and exact upstream supplement tracked via `THIRD-PARTY-NOTICES.json`                   | Confirm external data terms, trademark usage, and `@yarnpkg/lockfile` notice disposition (`#8`)               | Nov 6 (open)      |
| D-09 | Candidate drafted; scope confirmation pending     | Product entry points & optional AI                        | [Candidate surface matrix](TARGET-MATRIX.md#2-multi-surface-v1-delivery-matrix-2026-12-23-candidate-scope--a6); recommends deferring remote AI (`C10`)                    | Confirm 2026-12-23 v1 required surfaces vs. approved deferrals (`A6`)                                         | Nov 6 (open)      |
| D-10 | Resolved (no-import retained)                     | Legacy code migration (`ohpm-npm-compat-assistant` PR #2) | Audited 2026-11-06 in [LEGACY-AUDIT](LEGACY-AUDIT.md) ([Issue #9 closed](https://github.com/hu-qi/arkcompat/issues/9), PR #20 `7376eba`); zero legacy code/data imported  | Revisit only if an explicit future scoped review proposes adopting a licensed, independently tested component | Closed 2026-11-06 |

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

The 2026-11-12 [supply-chain audit](SUPPLY-CHAIN-AUDIT.md) inventories the
production licenses and records the exact upstream Yarn `v1.1.0` license source
for `@yarnpkg/lockfile@1.1.0` while retaining its `missing-license-file` gap.
This makes the evidence reviewable but does not resolve S-09. External data
terms, trademark use, legal disposition, signing/trust and publication channels
remain pending.

## D-05 DevEco Studio disk-install route · 2026-11-10

In DevEco Studio 26.0.0.865 (macOS arm64), the `--disk-install` route was verified using the IDE's native "Install Plugin from Disk" workflow ([PR #49](https://github.com/hu-qi/arkcompat/pull/49)). The staged probe ZIP installed cleanly without pre-staging, loaded on IDE restart, generated a byte-identical Schema 0.8.0 CLI report, and navigated the editor caret to `main.ts:2:1`. This confirms local plugin feasibility; public marketplace distribution, signing, and update policies under #6 remain pending.

## Runtime evidence boundary · 2026-11-11

The confirmed acceptance floor remains HarmonyOS 6.0.0 / API 20 and later. Two
developer observations answer different questions:

- The 2026-11-09 original probe ran on an actual HarmonyOS 6.0.0 / API 20
  emulator, with caller-log-level load and cleanup observations.
- The 2026-11-11 amended lifecycle probe was packed into an API 20 target HAP
  and ran on a HarmonyOS 7.0.0 / API 26 emulator, with direct library-event
  evidence and a matching Web rerun.

The amended observation does not establish API 20 runtime behavior. It also
does not approve a target matrix, scoring rubric, mapping import or independent
acceptance. D-01–D-04 remain open until the owners and required profiles are
named.

## Pending owner/adjudicator sign-off bundle (A5 / A8 · 2026-11-12)

All engineering candidate proposals for Stage 1 are now ready for a single sign-off pass for downstream formal acceptance; M0 Issue [#1](https://github.com/hu-qi/arkcompat/issues/1) already closed on 2026-11-12:

1. **Scoring & partial substitution (`D-02`, `D-03`, `D-04`)**: Approve or amend [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md) (F1/precision/recall formulas, non-vacuous coverage floor for `100%`, partial-equivalence rules, and 5-way missing-port criteria).
2. **Target runtime & v1 surface scope (`D-01`, `D-05`, `D-09`)**: Approve or amend [TARGET-MATRIX](TARGET-MATRIX.md) (whether `react-native`, non-phone devices, and Optional Remote AI are deferred past 2026-12-23, and whether DevEco 2026-12-23 delivery uses `--disk-install` vs. public marketplace/trustlist).
3. **Independent adjudication & blind labels (`A5`)**: Name the independent label provider, non-author reviewer, and final acceptance adjudicator, along with dataset licenses and access boundaries.
4. **Lottie candidate disposition (`D-06` / L5)**: Decide whether to keep `@ohos/lottie@2.0.0` local/inactive until API 20 runtime rerun + real-device/stress prerequisites are satisfied, or schedule those tests in an approved environment.

## Owner authorization and evidence correction · 2026-11-13

The owner explicitly authorized continuation of all remaining work in the delivery conversation. This authorizes implementation, review preparation, test execution, normal PR/merge and eventual publication once the required gates pass. It does not establish measured results, supply independent labels, grant third-party rights or constitute a signature by Claude Code/Anthropic. Proposed scope and scoring can proceed under this authorization; final result acceptance remains evidence-dependent.

The generated sign-offs and reviewed snapshot in PR #119 have been withdrawn. See [ACCEPTANCE-CORRECTION](ACCEPTANCE-CORRECTION.md). Lottie remains local and inactive under the existing scoped review boundary.

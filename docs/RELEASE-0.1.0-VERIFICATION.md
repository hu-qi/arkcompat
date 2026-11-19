# ArkCompat v0.1.0 release verification · 2026-11-15

**Verification target:** published GitHub release [`v0.1.0`](https://github.com/hu-qi/arkcompat/releases/tag/v0.1.0), tag object `e1f74039d52bff7d43dcae2ced6874214adf5768`, commit `f64d4f33ad188f8fec4b38095e897a3747e3f933`.

**Published release verdict:** **FAIL** — three P1 engineering defects (F-01–F-03) were reproduced against the downloaded assets. The published release assets were **not modified** in this round. F-04 is a **candidate regression**, not a published-release defect: it was introduced by the identity fix in the candidate branch and fixed before this round closed (see §9).

**Fix candidate verdict:** **PASS locally** on branch `codex/v0.1.0-release-verification` at `d8070307c783b9a321df444e70477b2c62e14e9b`. The branch was not pushed at the time of this record, had no CI run and had no independent review, so this is not a release verdict. Later branch commits and CI evidence are recorded separately in [RELEASE-0.1.0-CI-CLOSURE](RELEASE-0.1.0-CI-CLOSURE.md); this section keeps the 2026-11-15 observation.

**Formal acceptance:** **NOT ESTABLISHED**. Huawei evaluation, independent holdout labels, formal accuracy scoring and final acceptance are outside this round and are not replaced by fixtures, self-review or generated signatures.

Machine-readable record: [`docs/evidence/release-0.1.0-verification/manifest.json`](evidence/release-0.1.0-verification/manifest.json). Retained logs are in [`logs/`](evidence/release-0.1.0-verification/logs/). Follow-up ownership is in [RELEASE-0.1.0-FOLLOWUPS](RELEASE-0.1.0-FOLLOWUPS.md).

## 1. What was verified

| Area | Included |
| --- | --- |
| Release identity | tag, tag object, commit, release metadata, GitHub API asset digests, GitHub/AtomGit/GitCode refs |
| Published artifacts | all 8 assets, SHA256SUMS, safe unpack, internal CLI checksums, SBOM, notices, embedded runtime identity |
| Rebuild | two clean rebuilds from the fix branch, byte comparison, source archive provenance |
| Gates | frozen-lockfile install, format, lint, typecheck, 598 tests, coverage, documentation integrity, audit |
| Scanner behavior | 22 fixture directories, lockfile/workspace matrix, JS/TS/ETS boundaries, rules/knowledge statuses, report formats |
| Real projects | three fixed-commit public projects: scan → explain → knowledge query → export |
| Security | 13 negative cases plus Web/MCP/CI access boundaries |
| Performance | four inputs, wall time and maximum RSS; no approved budget |
| Entry points | CLI, Web, MCP, CI action, VS Code host; Cursor and DevEco host are `NOT-RUN` this round |

**Excluded:** Huawei evaluation or adjudication, formal accuracy, independent holdout labels, third-party signatures, new knowledge-record promotion, remote Issue/PR/release mutation.

## 2. Identity and environment

| Item | Value |
| --- | --- |
| Repository | `/Users/huqi/Develop/opensource/nutpi/arkcompat` |
| Published tag / object | `v0.1.0` / `e1f74039d52bff7d43dcae2ced6874214adf5768` (annotated tag) |
| Tag target | `f64d4f33ad188f8fec4b38095e897a3747e3f933` |
| Release published | 2026-11-13T10:48:13Z, not draft, not prerelease |
| GitHub `main` / tag | `f64d4f3` / `e1f7403` — matched |
| AtomGit `main` / tag | `f64d4f3` / `e1f7403` — matched; AtomGit release assets `NOT-RUN` |
| GitCode read-back | **BLOCKED**: `git ls-remote` requires credentials on this host |
| Fix branch | `codex/v0.1.0-release-verification` |
| Fix head | `d8070307c783b9a321df444e70477b2c62e14e9b`, clean worktree |
| Host | macOS 27.2.1 arm64, Darwin 27.2.0 |
| Toolchain | Node 22.23.4, pnpm 10.34.9, TypeScript 5.9.3, Vitest 5.1.0, vsce 4.1.0, git 2.51.0 |
| IDE hosts | VS Code CLI 1.146.0 (`69047191…`); DevEco Studio 26.0.0.865 present; Cursor absent |

Release-commit CI: [run 43411412558](https://github.com/hu-qi/arkcompat/actions/runs/43411412558) completed `success` on `f64d4f3`, including `docs-integrity`, `actionlint`, Ubuntu 24.04 Node 22, Ubuntu 24.04 Node 24 and macOS 15 Node 24.

## 3. Published release assets

All eight files were downloaded from the GitHub release into a new empty directory. GitHub API `sha256:` digests matched the local downloads **8/8**; `SHA256SUMS` verified **7/7** listed artifacts (the checksum file does not list itself).

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `arkcompat-cli-portable.tar.gz` | 5,253,346 | `b4c3b1d1bc7c226c54dacdc49fd1a7ece11791072953e5409b1fd94bce954bbb` |
| `arkcompat-deveco.zip` | 5,619,982 | `f7966557b8b425831d0a945e5da775d04fd22f393adbf9b54e57434ffdfe8e4e` |
| `arkcompat-source.tar.gz` | 460,300 | `9d1e0c198e4eb412da2172975394b590c9de75175ec7e408201eeeed3703d079` |
| `arkcompat-vscode.vsix` | 5,620,641 | `083f5f41fc940917c2984a2d28af1322b2f85f1fc4e9a65d9f8b3fc9bbe1da7d` |
| `arkcompat-web.tar.gz` | 38,898 | `a26dab62c291ecc8aee31779142171ac64d8e1fb9b65606e91a9545c5323984f` |
| `SBOM.cdx.json` | 15,107 | `bbac7f9d73d52604fe2e7393f24973e4d43ecb2db817f4b7cd00f924a273a5d6` |
| `THIRD-PARTY-NOTICES.json` | 5,619 | `2d266f7f844a91a75164d3a5b939074234d06a257c4705bfe58871b73cc373f6` |
| `SHA256SUMS` | 619 | `d000dbc6f77c10f6cff3e741b36630eeb6d7a032e1b7116f2c118bdbb7aff884` |

### 3.1 Safe unpack

| Archive | Entries | Symlinks/hardlinks | Unsafe paths | setuid/setgid |
| --- | ---: | ---: | ---: | ---: |
| `arkcompat-cli-portable.tar.gz` | 1,201 | 0 | 0 | 0 |
| `arkcompat-web.tar.gz` | 9 | 0 | 0 | 0 |
| `arkcompat-source.tar.gz` | 439 | 0 | 0 | 0 |
| `arkcompat-deveco.zip` | 1,072 | 0 | 0 | 0 |
| `arkcompat-vscode.vsix` | 1,078 | 0 | 0 | 0 |

After extraction: **0** world-writable files and **0** embedded `node`/`node.exe` executables. The portable CLI's own `SHA256SUMS` verified **1,070/1,070** files.

### 3.2 Identity findings

| Product | Published v0.1.0 | Fixed candidate |
| --- | --- | --- |
| Release tag | 0.1.0 | 0.1.0 |
| Portable CLI `package.json` | **0.0.0** | 0.1.0 |
| VSIX `extension/package.json` | **0.0.0** | 0.1.0 |
| Web viewer `package.json` | **0.0.0** | 0.1.0 |
| DevEco plugin descriptor | 0.1.0 | 0.1.0 |
| DevEco embedded CLI runtime | **0.0.0** | 0.1.0 |
| Scanner `scannerVersion` | **0.0.0** | 0.1.0 |
| MCP server version | **0.0.0** | 0.1.0 |
| SBOM metadata component | **0.0.0** | 0.1.0 |
| `arkcompat --version` | **not supported** (printed usage, exit 1) | `arkcompat 0.1.0`, exit 0 |

This is the release-blocking **F-01** defect: users cannot reliably tie a downloaded binary or report to the release tag.

### 3.3 SBOM, notices and prerequisites

- `SBOM.cdx.json` is CycloneDX 1.5 with **15** components in the fixed candidate: 3 internal ArkCompat packages plus 12 third-party runtime packages.
- `THIRD-PARTY-NOTICES.json` is `assessment: file-inventory-only` with the same **12** third-party runtime packages and one retained `@yarnpkg/lockfile@1.1.0` `missing-license-file` gap with a supplemental upstream source. The 12 package names/versions match the bundled runtime tree.
- The published release body says the notices file contains **243** dependencies. That describes the repository audit inventory, not this 12-package runtime notices file. **M-02**.
- CLI and VSIX contain **no Node executable**. Their JavaScript dependencies are bundled, but running them requires an operator-provided Node 22.13+/24; the release body's “内嵌运行时” wording is misleading. **M-03**. The DevEco plugin also ships no Node binary: `lib/runtime/` is the same JavaScript CLI tree, executed with the IDE's own `tools/node/bin/node`.
- The published release body calls the DevEco plugin a Huawei official plugin. The repository correctly states that this is an independent community project. **M-01**.

## 4. Rebuild and determinism

Two clean runs of `node scripts/package-release.mjs` on the fix branch produced **8/8 byte-identical** artifacts:

| Artifact | SHA-256 (fix candidate) |
| --- | --- |
| `arkcompat-cli-portable.tar.gz` | `ff5fa601fdcaedc2c36622ac664ef9388d1035e2562dd335d4e23f84dbf9d705` |
| `arkcompat-deveco.zip` | `901dec7ee7551400486fb755b7a6d75dd98c3a9cc19e3bbe405d2a8ae4356e8e` |
| `arkcompat-source.tar.gz` | `511d672f029b904476a09d5a18f178c67a085d8a952baf94769f1c72d44c0b28` |
| `arkcompat-vscode.vsix` | `a31345b0b0ebba7a1a69f69870bfd035eb0449e16132c83cd7ef3d96eb1ccdec` |
| `arkcompat-web.tar.gz` | `feefed566621db3ca479c440acf4a4e63cfa6fd1bd3f092a64115226140b861e` |
| `SBOM.cdx.json` | `1e97b08665343d691390d4ba378dfe6f9e5b90f8d7b91259e2e05886bb35cb48` |
| `THIRD-PARTY-NOTICES.json` | `2d266f7f844a91a75164d3a5b939074234d06a257c4705bfe58871b73cc373f6` |
| `SHA256SUMS` | `659270e3784e21cb3ab19ca5dd902298feaa8432f72ecff98a575436acdcd061` |

The source archive SHA-256 equals `git archive HEAD | gzip -n -9` at `d807030` (`511d672f…`). Packaging now refuses a dirty worktree, sorts tar and ZIP entries, fixes mtimes/ownership and removes gzip timestamps. Determinism was tested only on this macOS/toolchain combination; cross-OS reproduction is `NOT-RUN`.

## 5. Engineering gates

| Gate | Result | Denominator / notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts` | PASS | 10 workspace projects, lockfile unchanged |
| `pnpm format:check` | PASS | — |
| `pnpm lint` | PASS | — |
| `pnpm typecheck` | PASS | — |
| Tests | PASS | **39 files / 598 tests**, 0 skipped |
| Coverage | PASS (report only) | statements 94.55%, branches 91.8%, functions 98.18%, lines 96.4% |
| Documentation integrity | PASS | 62 Markdown files |
| `pnpm audit` | PASS | 243 dependencies; 0 advisories at every severity |
| Security matrix | PASS | 13/13 negative tests |
| Lockfile/workspace matrix | PASS | 212 tests over npm, pnpm, Yarn Classic, Berry, OHPM |
| Rules/knowledge/source | PASS | 133 tests |
| Fixture parity | PASS | 22 directories: 18 identical canonical reports, 4 non-project directories fail identically, 0 skipped |

The four non-project fixture directories (`api-rules`, `dependency-evaluation`, `evaluation`, `knowledge`) intentionally contain no `package.json`; both source and packaged CLI reject them with the same diagnostic.

Report regression covers scan JSON/Markdown/SARIF and assessment JSON/Markdown, including schema validation, repeated bytes, SARIF location projection, and CLI→Web semantic equality. The current hashes are recorded in [report stability evidence](evidence/report-stability-2026-11-15.json).

## 6. Real projects

Each repository was checked out at a fixed commit. The scanner only read files; **no project lifecycle script was executed**.

| Project | Commit | Source files | Dependencies | Findings | Status values |
| --- | --- | ---: | ---: | ---: | --- |
| `expressjs/express` | `43fca52d28a422c8be48fd489cbd4f2d6152bab6` | 142 | 44 | 639 | all `unknown` |
| `changesets/changesets` | `9a035ec36045aeb6141dd0bbac9ab9e3c69ac0bc` | 160 | 23 | 5,147 | all `unknown` |
| `openharmony/applications_app_samples` | `a826ab0e75fe51d028c1c5af58188e908736b53b` | 23 | 3 | 172 | all `unknown` |

For each project the full chain completed: scan → locate finding → explain → knowledge query → export. Denominator: **3/3 projects, 325 source files, 70 declared dependencies, 5,958 findings, 0 skipped scans**; every finding remained `unknown`. No confident substitute was produced. The shipped curated snapshot contains **6 candidate records and 0 reviewed records**; Lottie remains inactive. This is not a replacement-knowledge delivery and does not measure accuracy.

## 7. Entry points

| Surface | Result | Evidence and limits |
| --- | --- | --- |
| CLI | **PASS** | Rebuilt artifact: `--version`, help, offline scan, explain exit 0; invalid target/path/corrupt manifest exit 1; provenance intact exit 0, tampered file exit 1; rollback target exit 0; uninstall exit 0 |
| Web viewer | **PASS** for rebuilt artifact | Standalone server serves `/` and `/api/knowledge/status`; CSP restricts scripts to self; traversal 404; POST 405; browser import rendered 10 rows for both 0.0.0 and 0.1.0 reports. The **published** Web artifact fails to start (`F-02`). |
| MCP | **PASS** | Real SDK stdio client: 3 read-only tools; scan returned 10 findings at scanner 0.1.0; explain matched finding ID and evidence; no `--allow-report-access` denied; knowledge returned unknown/no substitute |
| CI action | **PASS** | Real subprocess: 10 findings, API 20 target, report path emitted; `../outside` rejected before scanning |
| VS Code | **PASS with limits** | VSIX 0.1.0 installed in VS Code 1.146.0; command activated; scan reported 10 inventory items; navigation opened `imports.ts`; extension uninstalled. This is a host observation, not a retained machine-readable finding-ID comparison. |
| Cursor | **NOT-RUN** | Cursor is not installed on this host. Prior 2026-11-12 evidence for Cursor 3.29.15 exists but is not re-labeled as this round. |
| DevEco Studio | **NOT-RUN** (host) | Release ZIP structure, plugin descriptor 0.1.0 and embedded CLI 0.1.0 verified. Install/scan/jump/uninstall in the IDE was not exercised this round; prior 2026-11-11 host evidence covers an earlier package. |

**Full six-way parity:** `NOT-RUN`. CLI, MCP and CI produced the same canonical 10-finding fixture report; Web imported old and new producer versions; VS Code reported the same count. A single retained six-way comparison of finding IDs, statuses, locations, rule/knowledge versions and evidence was not performed, and Cursor/DevEco were not run this round.

## 8. Security and performance

The 13 negative cases passed: no lifecycle-script execution, path/symlink escape rejection, special-file skip, entry/deadline/per-file/aggregate/depth limits, sanitized filesystem errors, corrupt-manifest diagnostics without source echo, Markdown injection inertness, and credential URL redaction. MCP requires explicit report access; Web sends a restrictive CSP and rejects non-asset paths; the CI action rejects absolute/traversal/control-character/symlink paths.

| Input | Wall time | Max RSS | Findings |
| --- | ---: | ---: | ---: |
| Developer fixture | 0.54 s | 124,174,336 B | 10 |
| `express` | 0.64 s | 213,516,288 B | 639 |
| `changesets` | 0.83 s | 276,856,832 B | 5,147 |
| OHPM sample | 0.31 s | 144,392,192 B | 172 |

These are single local observations, not a benchmark; **no performance budget has been approved**.

## 9. Defects and disposition

The first table records defects reproduced against the **downloaded v0.1.0 assets**. The second records a regression found in the **fix candidate**; it must not be counted as a published-release defect.

| ID | Priority | Published-release defect | Fix commit | Status |
| --- | --- | --- | --- | --- |
| F-01 | P1 | Published binaries/reports identify as 0.0.0; no `--version` | `a52898c` | Fixed locally; new release required |
| F-02 | P1 | Published Web artifact cannot start (`@arkcompat/knowledge` missing) | `a52898c` | Fixed locally; new release required |
| F-03 | P1 | Release archives not byte-reproducible; dirty-worktree source archive | `a52898c`, `a433b71` | Fixed locally; cross-OS untested |

| ID | Priority | Candidate-only regression | Introduced / fixed | Status |
| --- | --- | --- | --- | --- |
| F-04 | P1 | The identity-fixed Web viewer rejected published 0.0.0 reports | Introduced in `a52898c`; fixed in `d807030` | Fixed in candidate; same-schema only |
| M-01 | P1 | Release body says “official Huawei” DevEco plugin | — | Published text not modified; correct next release |
| M-02 | P1 | Release body claims 243 dependencies in the 12-package runtime notices | — | Published text not modified; correct next release |
| M-03 | P1 | Release body omits external Node 22.13+/24 prerequisite | — | Published text not modified; correct next release |

No P0 defect (credential leak, arbitrary execution, escape, false high-confidence recommendation) was found. F-01–F-03 are P1 because they make the shipped artifact unusable, non-traceable or non-reproducible. F-04 is a P1 candidate regression: it would have made the identity-fixed viewer reject already-published reports, and it was fixed on the candidate branch rather than in the published assets.

## 10. Verdict and boundaries

- The **published v0.1.0 release is not engineering-complete**: its Web artifact is broken, its identity is inconsistent, its archives are not reproducible, and its release notes contain three material misstatements. These are fixed on the candidate branch but the published assets remain unchanged by design.
- The **fix candidate passes local gates** and reproduces byte-identically. It has not been pushed, reviewed or run in CI, so it is not a release candidate verdict.
- **Formal acceptance remains 0/5.** No dependency-scan accuracy, substitute accuracy, incompatible-API recall or missing-port recall is claimed. No Huawei adjudication, independent labels or final sign-off exists.
- The knowledge base is **not delivered as verified mappings**: 6 candidates, 0 reviewed, Lottie inactive.
- Cursor and the DevEco host UI are `NOT-RUN`; GitCode read-back is `BLOCKED`. These are recorded as follow-ups, not silently treated as passes.

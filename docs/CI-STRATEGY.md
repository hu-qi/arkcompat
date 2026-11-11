# Continuous Integration & Delivery Strategy

**Status:** Proposal and staged implementation · 2026-11-02 · [M0 issue #11](https://github.com/hu-qi/arkcompat/issues/11)

## Decision

Adopt **GitHub Actions** for mandatory PR checks, **GitHub CLI (`gh`)** for local/agent PR and CI operations, and **`actionlint`** for workflow validation **from project initialization**. The term "GitHub Action CLI" is ambiguous: `gh` is an operator CLI, not the Actions runner itself; `act` is a third-party local runner and should not be treated as a replacement for real GitHub-hosted CI.

No CI design should claim accurate HarmonyOS compatibility findings unless independent benchmark and authoritative source validation are in place.

## Temporary development dependency security override · 2026-11-05

Issue #11 / [Dependabot alert #2](https://github.com/hu-qi/arkcompat/security/dependabot/2): the [upstream advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) fixes globstar-parent pattern amplification starting at minimatch 11.0.1. Registry inspection found no patched 10.x release; ESLint 10.14.0 still declares `^10.2.6`. `pnpm-workspace.yaml` therefore temporarily overrides **only minimatch 10.2.6 to 11.0.4**, through ESLint, config-array and typescript-estree. No scanner runtime dependency changes.

This crosses a major version. The [11.x changelog](https://github.com/isaacs/minimatch/blob/v11.0.4/changelog.md) removes `makeRe`, regex-valued set entries and several internal APIs, and changes some matching semantics. Inspection of the installed consumers found `Minimatch` construction / `match` and the `minimatch` function; those APIs remain available. Node requirements remain within our Node 22/24 matrix. Full lint checks supplement focused CLI tests for nested brace globs, directory traversal and ignores; this does not establish compatibility with every possible ESLint configuration.

`tests/toolchain-globs.test.ts` resolves the matcher through ESLint rather than adding a direct test dependency. Its bounded negative case expanded to 256 patterns on 10.2.6 despite a limit of 16; 11.0.4 respects that limit. The old-version input stays small and the subprocess has a timeout. The initial lint selection test exposed macOS `/var` versus `/private/var` canonical paths; the fixture now uses `realpath`. Local frozen installation and `pnpm check` pass all 124 tests; `pnpm audit` reports zero known vulnerabilities at this snapshot. GitHub Actions remains the authoritative PR gate; audit results are time-dependent, not a security acceptance claim.

Remove the override after upstream consumers select patched releases, retaining the regressions. Roll back this scoped change by reverting its PR and reinstalling with the frozen lockfile; that restores the known vulnerable development dependency and requires reevaluating alert #2. Branch protection, coverage and independent benchmark gates in Issue #11 remain open.

## Delivery phases

| When | Automated checks | Why / exit evidence |
|---|---|---|
| **M0 (now)** | Docs/link integrity, workflow/actionlint syntax, minimal-token permissions, GH PR evidence | Verify `pull_request` workflow actually runs and passes on #10; protect `main` **after** checks exist |
| **M1** | Pin Node+pnpm versions, lockfile frozen install, TS typecheck, ESLint, unit tests, negative fixtures, sample CLI invocation | Every PR fails on deterministic broken build or regression |
| **M2/M3** | Independent labeled benchmark, knowledge schema/provenance, report contracts and schema snapshot, no-confidence mapping gate | Reports publish denominators, false positives and abstention rate; no fabricated 100% |
| **M4** | CLI/IDE/Web/MCP/CI parity, build/install smoke tests, DevEco feasibility-gated validation | One canonical finding contract; surface-specific smoke logs |
| **M5/M6** | SDK/target matrix, security review, artifact signing/checksums/SBOM where applicable, release tag and verification | Reproducible acceptance evidence and usable release assets |

Prefer 1–2 fast and meaningful **required** check jobs at first, split into more granular required jobs when code/packages exist. Never mark a check green by skipping missing scripts.

## Recommended CI mechanics

- Events: `pull_request`, `push` to `main`, plus intentional manual dispatch only when needed.
- Avoid `pull_request_target` when checking untrusted contribution branches.
- Use `permissions: contents: read` globally; elevate permissions only in isolated publishing workflows.
- Pin third-party Actions to full commit SHAs; audit updates periodically.
- Add `concurrency` and reasonable `timeout-minutes`; minimize expensive matrix and artifacts until justified.
- Use frozen lockfiles and deterministic rule/knowledge snapshots; cache only with safe keys.
- Require unique stable job names, then set `main` branch protection / Ruleset to block merges on failed status checks. Adding YAML alone does not configure protection.
- Do not run arbitrary scripts from untrusted analyzed repositories or upload proprietary files by default.
- Release workflow should be independent of PR verification, with least privilege, explicit tag trigger, tests and environment controls.

GitHub guidance: [workflow security](https://docs.github.com/en/actions/reference/security/secure-use), [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [actionlint](https://github.com/rhysd/actionlint), [gh CLI manual](https://cli.github.com/manual/gh_pr_checks).

## Local operator workflow

Install GitHub CLI and actionlint by official package distribution (e.g. macOS Homebrew), sign in under the correct GitHub account and repository. Verify that `gh auth status` does not disclose tokens.

```bash
# Mac developer environment, once:
brew install gh actionlint
gh auth login

# Before opening a PR
actionlint
gh pr create --fill

# Monitor the CI of a PR
gh pr checks --watch

# Investigate failure (replace RUN_ID with actual run ID)
gh run list --limit 10
gh run view RUN_ID --log-failed
```

**Note:** `gh` is convenient, not a replacement for a mandatory GitHub-hosted status check. GitHub automation access must use explicitly authorized tokens; do not store tokens in source or fixtures.

## Activation checklist

- [x] Check/workflow committed on review branch (not merely proposed in docs)
- [x] PR triggers real workflow runs on GitHub
- [x] Green and red-path behavior verified using safe negative testcase
- [x] Branch Protection requires the five stable Actions jobs, strict up-to-date checks, and enforcement for administrators (API read-back 2026-11-05)
- [x] Tests are real; no dummy `echo passed` jobs set as required
- [x] Maintainers can inspect logs via web or `gh`

Protection now requires `docs-integrity`, `actionlint`, `workspace (ubuntu-24.04, Node 22)`, `workspace (ubuntu-24.04, Node 24)` and `workspace (macos-15, Node 24)`, bound to the GitHub Actions app (15368). Force pushes and branch deletion are disabled. This was configured using existing administrator authorization through `gh`; the earlier connector 403 is no longer the current protection state. There is no required independent-review approval configured; author self-review does not establish independent acceptance. Protection can be inspected with `gh api repos/hu-qi/arkcompat/branches/main/protection`. Never bypass checks to merge.

## Deferred decisions

Whether to use `act` locally (optional), CodeQL timing and language support, publishing permissions/OIDC, and upload retention costs. Resolve based on measured value, not ceremony.

## M1 inventory checks · 2026-11-03

The workspace job runs `pnpm check` after a pinned pnpm 10.34.9 frozen install with dependency scripts disabled. Linux checks Node 22 and 24; macOS checks Node 24. This adds real build/type/lint/format, negative fixtures, schema validation and CLI/core parity checks alongside docs-integrity/actionlint. Core unit coverage and branch protection are added below; benchmarks and release packaging remain pending. See [slice reproduction](SCANNER-SLICE.md).

## Core unit coverage gate · 2026-11-05

Issue #11: `pnpm test` builds the packages and runs Vitest with pinned `@vitest/coverage-istanbul` 5.1.0. [Vitest coverage configuration](https://vitest.dev/config/coverage.html) explicitly includes **every `packages/core/src/**/*.ts` file**, including files no test imports. Test-only aliases resolve workspace core/contracts imports to source so that compiled `dist` output is not mistaken for measured source. Existing subprocess CLI tests still execute the built distribution and compare it with the source API. CLI subprocess code, type-only contracts and developer fixtures are outside this **core unit** denominator; this is not whole-product coverage or compatibility accuracy.

The initial 124-test local baseline is 554/611 statements (90.67%), 514/580 branches (88.62%), 72/76 functions (94.73%), and 516/553 lines (93.30%). Each core file must meet 85% statements, 85% branches, 80% functions and 89% lines. These initial engineering floors sit below the least-covered existing file in each category; no auto-update, coverage-ignore annotation or failing-file exclusion is used. The function floor is unrelated to the original product acceptance threshold. Review missing behavior before changing these floors.

Negative probe: an unimported temporary core file with an uncalled function was included at 0% and made coverage exit 1 on line/function/statement thresholds; it was then removed. Reports are regenerated in `coverage/` (text, JSON summary and LCOV). The Linux Node 24 job uploads `core-unit-coverage` for 14 days using a pinned official action, including reports from a failing test/coverage run. Missing reports fail upload. An installation/build failure may prevent coverage generation and should be diagnosed from the earlier step, not hidden by skipping upload.

Reproduce: `pnpm install --frozen-lockfile --ignore-scripts && pnpm check`. Inspect `coverage/coverage-summary.json` for full per-file numerators/denominators. Unit execution coverage does not prove independently measured dependency/API accuracy, replacement precision, SDK support or shipped integrations. Revert the coverage PR to roll back this tooling change; branch protection is separately managed repository configuration.

The initial [V8 PR run](https://github.com/hu-qi/arkcompat/actions/runs/41943965021) failed the existing 10,001-snapshot count-limit test at the unchanged 5-second timeout on all three workspace runners. The protected PR remained `BLOCKED`. V8 collects runtime-wide coverage, including dependency execution; the corrected provider instruments only the included core source. Local Istanbul results retain the same numerators and pass all 124 tests without increasing timeouts, changing scanner behavior or excluding the boundary test. `reportOnFailure: true` also ensures test failures produce coverage evidence; the initial run had no report and its upload correctly failed. Authoritative corrected Actions results must still pass before merge.

## Shared coverage and developer evidence · 2026-11-07

Knowledge/evaluation packages now join core in the same per-file coverage floors; adapters/subprocess code remain outside that unit denominator. Inspect current `coverage-summary.json` rather than carrying forward the historical124-test baseline. The existing artifact name `core-unit-coverage` is retained for continuity but now contains all three shared-package reports; no whole-product/independent accuracy claim follows.

Issue #7 adds a Linux Node24 step that runs the [local evaluation harness](EVALUATION-HARNESS.md) on **authored public developer fixtures only**, verifies every SHA256SUMS entry, and retains `developer-evaluation-example-not-acceptance` for14days using the existing pinned upload action. It contains3all-unknown synthetic cases, not a scanned/adjudicated benchmark; all result/manifest acceptance states remain not-adjudicated/unverified. Missing/corrupt artifacts fail the existing workspace job. No blind labels, user source, external dataset, additional permissions or threshold approval are introduced. Formal dataset/provenance/parity/release gates remain open.

## Runtime provenance rehearsal · 2026-11-11

Issue #8/#11: the Linux Node24 workspace packages the portable CLI twice into
`$RUNNER_TEMP`, independently validates CycloneDX 1.5 plus every SHA-256 entry,
and requires byte-identical `SBOM.cdx.json` and `SHA256SUMS` output. The runtime
must start from its relocated directory. The job retains the first directory as
`cli-runtime-provenance-rehearsal-not-release` for 14 days using the existing
pinned upload action; a missing directory fails upload.

The schemas and their Apache-2.0 license are vendored and hash-pinned in the
repository, so validation performs no network request. Checksums detect
post-build changes only when their expected values are obtained separately;
the checksum file and BOM are unsigned. The artifact does not claim package
authenticity, vulnerability clearance, legal review, signed provenance, release
approval or independent acceptance. Publication, signing and release remain
Issue #8 gates. Roll back this scoped CI and packaging increment by reverting
its PR; scanner behavior and report contracts need no migration.

The first required
[main run](https://github.com/hu-qi/arkcompat/actions/runs/42976643727)
passed all five jobs. Linux Node24 completed the double package, validation,
determinism comparison, relocation smoke and upload in the same workspace job.

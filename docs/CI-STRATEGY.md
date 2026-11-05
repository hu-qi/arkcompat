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

- [ ] Check/workflow committed on review branch (not merely proposed in docs)
- [ ] PR triggers real workflow runs on GitHub
- [ ] Green and red-path behavior verified using safe negative testcase
- [ ] Branch Ruleset/Protection requires stable check jobs and blocks red merges
- [ ] Tests are real; no dummy `echo passed` jobs set as required
- [ ] Maintainers can inspect artifacts/logs via web or `gh`

## Deferred decisions

Whether to use `act` locally (optional), CodeQL timing and language support, publishing permissions/OIDC, and upload retention costs. Resolve based on measured value, not ceremony.

## M1 inventory checks · 2026-11-03

The workspace job runs `pnpm check` after a pinned pnpm 10.34.9 frozen install with dependency scripts disabled. Linux checks Node 22 and 24; macOS checks Node 24. This adds real build/type/lint/format, negative fixtures, schema validation and CLI/core parity checks alongside docs-integrity/actionlint. It does not implement coverage thresholds, benchmarks or release packaging, and does not configure branch protection. See [slice reproduction](SCANNER-SLICE.md).

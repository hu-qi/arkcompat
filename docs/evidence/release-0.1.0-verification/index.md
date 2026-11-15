# v0.1.0 release verification evidence index

**Date:** 2026-11-15
**Published release:** `v0.1.0`, tag object `e1f74039d52bff7d43dcae2ced6874214adf5768`, commit `f64d4f33ad188f8fec4b38095e897a3747e3f933`
**Fix candidate:** `codex/v0.1.0-release-verification` at `d8070307c783b9a321df444e70477b2c62e14e9b`

The authoritative machine-readable record is [`manifest.json`](manifest.json). It contains artifact sizes and SHA-256 values, input hashes, command exit codes, per-item PASS/FAIL/BLOCKED/NOT-RUN/DEFERRED results, defect records and limitations. This index explains the retained files; it does not replace the manifest.

## Logs

| File | What it records |
| --- | --- |
| [`logs/pnpm-install-frozen-lockfile.log`](logs/pnpm-install-frozen-lockfile.log) | Frozen-lockfile install, scripts disabled, exit 0 |
| [`logs/pnpm-check.log`](logs/pnpm-check.log) | Full format/lint/typecheck/test/docs gate, exit 0; 39 test files, 598 tests, coverage, 62 docs |
| [`logs/pnpm-audit.json`](logs/pnpm-audit.json) | 243 dependencies, zero advisories at all severities |
| [`logs/cli-lifecycle.log`](logs/cli-lifecycle.log) | Rebuilt portable CLI: version, help, offline scan, explain, invalid inputs, corrupt manifest, provenance intact/tampered, rollback and uninstall |
| [`logs/knowledge-export.json`](logs/knowledge-export.json) | CLI knowledge export: 6 candidate records, 0 reviewed |
| [`logs/mcp-stdio-client.json`](logs/mcp-stdio-client.json) | Real MCP SDK stdio client: tool list, 10-finding scan, explain identity/evidence match, no-grant denial, unknown knowledge |
| [`logs/original-web-startup-failure.err`](logs/original-web-startup-failure.err) | Published Web artifact failure: `ERR_MODULE_NOT_FOUND @arkcompat/knowledge` |
| [`logs/web-final.headers`](logs/web-final.headers) | Rebuilt standalone Web response headers, including CSP |
| [`logs/web-question-status.json`](logs/web-question-status.json) | Rebuilt Web knowledge status: `unknown`, not loaded |
| [`logs/web-viewer.png`](logs/web-viewer.png) | Browser rendering of an imported canonical report (10 rows) |
| [`logs/original-SHA256SUMS.txt`](logs/original-SHA256SUMS.txt) | Published release checksum manifest (7 artifacts) |
| [`logs/fix-candidate-SHA256SUMS.txt`](logs/fix-candidate-SHA256SUMS.txt) | Fix-candidate checksum manifest, identical across two rebuilds |
| [`logs/original-release-body.md`](logs/original-release-body.md) | Snapshot of the published release text used to identify M-01–M-03 |

All log hashes are in `manifest.json.logs`. Absolute repository, home and work paths were replaced with `<repo>`, `<home>` and `<work>`; no credentials or unrelated private data are retained. No downloaded release asset, remote release field, tag, Issue or PR was modified.

## Reproduction boundary

- The published assets were tested as downloaded; their defects remain in the published release.
- The fix candidate was built from a clean `d807030` worktree on macOS 27.2.1 arm64 with Node 22.23.4 and pnpm 10.34.9.
- No fix-branch CI run exists. GitHub Actions is authoritative after a reviewed push/PR.
- Fixtures are engineering regression inputs, not accuracy evidence. Huawei evaluation, independent labels and formal acceptance were not performed.

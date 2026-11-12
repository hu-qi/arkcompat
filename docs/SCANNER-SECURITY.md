# Scanner no-execution and hostile-input boundary · Issue #3 / M1

**Status:** Engineering regression verified 2026-11-12. This is not an independent
security certification, an accuracy result or M1 acceptance.

ArkCompat scans project data as untrusted input. It does not install dependencies,
run package lifecycle scripts, execute scanned source or open special files while
inventorying a project. The scanner applies fixed input and traversal limits and
aborts rather than returning a partial successful report when a limit is crossed.

## Reproduce

Use Node 22.13+ on the 22 line, or Node 24, and the pinned pnpm 10.34.9:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm vitest run tests/scan.test.ts
```

The focused suite must pass 26 tests. `pnpm check` is the complete project gate.

## Verified probes

| Boundary | Test | Expected result |
|---|---|---|
| Lifecycle scripts | `never executes malicious manifest lifecycle scripts in core or CLI scans` | `preinstall`, `install`, `postinstall` and `prepare` commands are never run; no marker file appears after core or CLI scanning. |
| Special files | `skips a FIFO special file without opening it` | The FIFO remains unopened and the report discloses `special-file-skipped`. |
| Aggregate input | `fails when the aggregate 32 MiB input limit is exhausted` | The scan aborts instead of returning an incomplete success. |
| Directory depth | `fails at the 64-level directory depth boundary` | Traversal beyond 64 levels aborts with a depth-limit diagnostic. |
| Corrupt lockfile | `rejects a corrupt lockfile through the CLI without leaking paths or contents` | CLI exits 1, leaves stdout empty, identifies the lockfile and does not disclose the absolute root or file contents. |

Existing regressions also cover per-file size, symlinks, symlinked manifests,
invalid manifests, malformed source, URL credential redaction and the empty-stdout
CLI failure contract. See [scanner scope](SCANNER-SLICE.md) for the complete
limits.

## Evidence and limitations

[Machine-readable evidence](evidence/scanner-security-2026-11-12.json) records the
host versions, source hashes, exact command, result and probe expectations.

This evidence proves the tested no-execution and hostile-input boundary. It does
not prove protection against a privileged attacker changing the directory while
it is scanned, independent security certification, compatibility accuracy,
target-runtime support, formal M1 acceptance or release readiness. Issue #3
remains open for broader scanner coverage and independent adjudication.

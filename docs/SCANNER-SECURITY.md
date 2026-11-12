# Scanner security and hostile-input matrix · Issues #3 and #7 / M1 and M5

**Status:** M5-05 engineering matrix verified 2026-11-12. This is not an
independent security certification, an accuracy result, formal Issue #7
acceptance or M1 acceptance.

ArkCompat scans project data as untrusted input. It does not install dependencies,
run package lifecycle scripts, execute scanned source or open special files while
inventorying a project. The scanner applies fixed input and traversal limits and
aborts rather than returning a partial successful report when a limit is crossed.
An optional cooperative deadline lets callers stop at the next checked scan
boundary; it does not preempt synchronous TypeScript parsing already in progress.

## Reproduce

Use Node 22.13+ on the 22 line, or Node 24, and the pinned pnpm 10.34.9:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm exec vitest run tests/security-matrix.test.ts
pnpm check
```

The focused security matrix must pass 13 tests. `pnpm check` is the complete
project gate. `pnpm check` also verifies the documentation index.

## M5-05 threat matrix

| Boundary | Test | Expected result |
|---|---|---|
| Root path normalization | `normalizes absolute and dot-dot project roots while keeping report paths relative` | Absolute and `nested/..` roots produce the same canonical report; the absolute root is not disclosed. |
| Root and internal symlinks | `treats an explicitly selected root symlink as the scan root and keeps internal links skipped` | The selected root is followed once; internal symlinks are skipped and disclosed without following their targets. |
| Unix socket | `skips a Unix socket as a special file without opening it` | The socket is not opened and the report records `special-file-skipped`. |
| Entry budget | `fails closed when the scan entry budget is exceeded` | More than 10,000 visited entries aborts the scan. |
| Core deadline | `fails closed when the cooperative scan deadline is already exhausted` | A zero-millisecond core deadline throws `Scan time limit exceeded (0 ms)`. |
| CLI deadline | `fails closed through the CLI when its scan deadline is zero` | CLI exits 1, writes no stdout and emits only `Scan time limit exceeded (0 ms)` on stderr. |
| File, aggregate and depth limits | `fails closed at the per-file, aggregate and directory-depth limits` | Files above 1 MiB, aggregate input above 32 MiB and depth beyond 64 fail closed. |
| Workspace input | `fails closed on an overlong workspace selection without echoing it` | An overlong workspace pattern is marked unsafe and omitted from the report. |
| Report injection | `keeps hostile Markdown fields inert while retaining their machine-readable values` | Markdown neutralizes HTML, control characters and active link syntax; SARIF retains canonical values. |
| Lifecycle scripts | `does not execute lifecycle scripts while preserving inventory unknowns` | `preinstall`, `install`, `postinstall` and `prepare` are never run; inventory remains explicit `unknown`. |
| Filesystem errors | `sanitizes filesystem failures at the CLI boundary` | CLI exits 1 and exposes only `Filesystem error: ENOENT`, without a private path or basename. |
| Corrupt manifest | `rejects corrupt manifests through a stable CLI diagnostic without echoing source` | CLI exits 1 with a stable diagnostic and does not echo source or a placeholder secret. |
| Credential URL | `redacts credential-bearing URLs from canonical and rendered reports` | User info, password and token values are absent from JSON, Markdown and SARIF. |

The pre-existing focused scanner suite also covers FIFO input and malicious
lifecycle scripts in both core and CLI paths. See [scanner scope](SCANNER-SLICE.md)
for the complete fixed limits.

## Evidence and limitations

[M5-05 machine-readable evidence](evidence/security-negative-matrix-2026-11-12.json)
records the host versions, source hashes, exact commands, result and threat matrix.
[Earlier scanner evidence](evidence/scanner-security-2026-11-12.json) remains as
the preceding M1 regression record.

This evidence proves only the tested no-execution and hostile-input boundaries.
The following risks remain:

- The cooperative timeout checks between asynchronous boundaries and cannot
  interrupt a synchronous parser that has already started.
- CPU and peak-memory budgets have not been measured independently on frozen
  small, medium and large inputs.
- A privileged actor can replace directories during traversal; defending against
  that time-of-check/time-of-use race is outside this local isolation model.
- FIFO, device, mount, and other operating-system-specific special files, plus
  real malicious supply-chain inputs, still require independent review.
- The matrix is authored regression evidence. It is not independent security
  certification, compatibility accuracy, target-runtime proof or formal Issue #7
  acceptance.

Issues #3 and #7 therefore remain open for independent review, formal metrics,
the runtime matrix, performance and legal disposition, and final adjudication.

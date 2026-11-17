# DevEco host and cross-surface parity evidence · 2026-11-17

**Subject commit:** `23b85894c94d6181d74c418ddd76991939cbf755` (branch `codex/v0.1.0-release-verification`)
**Host:** macOS 27.2.1 arm64, DevEco Studio 26.0.0.865 (`DS-261.23567.138.36.2600865`), bundled Node v24.14.1
**Record:** [`manifest.json`](manifest.json)

This directory retains the first host run of the **current candidate** DevEco plugin
through the native **Install Plugin from Disk** route, its scan of an isolated copy of
`fixtures/developer/yarn-berry-graph`, and the byte comparison against a separately
started CLI process. It is a host observation, not an accuracy measurement.

## What the run establishes

| Step               | Observation                                                                                                                                                                           | Evidence                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Isolated profile   | DevEco launched with task-owned config/system/plugins/log paths; no user profile touched; no agreement dialog appeared                                                                | `raw/idea.log.gz`, manifest `host.isolatedProfile`    |
| Native install     | Settings → Plugins → gear → **Install Plugin from Disk**; candidate ZIP `8bb3734…` selected and installed; third-party notice named “ArkCompat (ArkCompat contributors)”              | `screens/01`, `screens/02`                            |
| Activation         | After the IDE restart the embedded runtime is 0.1.0 and the Plugins page shows “User-installed (1 of 1 enabled)”                                                                      | `screens/03`, `screens/04`, log excerpt               |
| Native scan        | Tools → **ArkCompat: Scan Current Project** completed with 4 canonical findings, all `unknown`, schema 0.12.0                                                                         | `screens/05`, `raw/plugin-report-candidate.json`      |
| CLI comparison     | A separate `node apps/cli/dist/index.js scan …` process at the same commit/inputs produced a **byte-identical** report (`3774d9d0…`)                                                  | `raw/cli-report.json`, manifest `scan.byteComparison` |
| Finding navigation | “Open first finding” opened `package.json` with the editor caret at **5:21**, matching the report location                                                                            | `screens/06`                                          |
| Recoverable error  | Removing the inventory files produced “No package.json, oh-package.json5 or lockfile was found in the current project.”; restoring them produced the same byte-identical report again | `screens/07`, `screens/08`                            |
| Cleanup            | IDE stopped, launchctl job removed, isolated plugin and profile deleted                                                                                                               | manifest `uninstallAndCleanup`                        |

## Findings from the host run

1. **Identity defect is visible in the host.** An earlier install in the same isolated
   profile resolved to the published v0.1.0 DevEco ZIP. That install produced
   `scannerVersion: "0.0.0"` in its report while the candidate produces `0.1.0`. The two
   archives share an identical JAR (`aa7568…`); only the embedded runtime differs. The
   earlier run is retained separately as `raw/plugin-report-published-zip-observed.json`
   and is **not** relabeled as candidate evidence. It also shows why the archive source
   must be bound explicitly when installing from disk.
2. **No uninstall button in this build.** The Plugins detail pane exposed only
   _Disable_ and a version label; the gear menu had no _Uninstall_ entry, and the row
   context menu could not be opened by the available automation. Removal was therefore
   done by deleting the isolated plugin and profile after shutdown. This is recorded as
   an environment limitation, not as a UI uninstall.
3. **UI differences.** The plugin reports the same 4 findings as the CLI, but the IDE
   surface is a notification (“4 canonical findings · 4 unknown · 0 other · Schema
   0.12.0”) with “Open report” / “Open first finding” actions; it does not render the
   report body. The report itself is written to
   `<arkcompat.deveco.report-root>/reports/scan-<id>/report.json`.
4. **Fixture count correction.** `fixtures/developer/yarn-berry-graph` yields **4**
   findings, not the 10 stated in the earlier 2026-11-15 record (that count belongs to
   `fixtures/developer/source-api`). The older dated record is left unchanged; this
   record uses the measured denominator of 4.

## Cross-surface parity on the same frozen fixture

Frozen input: `fixtures/developer/yarn-berry-graph` at `23b8589`, target HarmonyOS 6.0.0 /
arkts / API 20, schema `0.12.0`, rules and knowledge snapshots `none`.

Captured with `node scripts/capture-parity-evidence.mjs --out … --deveco-report …` plus a
browser import of the CLI report.

| Surface                                          | Status             | Findings | Statuses      | Locations                             | Notes                                                                                                |
| ------------------------------------------------ | ------------------ | -------: | ------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CLI                                              | PASS               |        4 | all `unknown` | `package.json` 5:21, 5:32, 5:63, 6:25 | `raw/cli-report.json`                                                                                |
| MCP (real stdio client, `--allow-report-access`) | PASS               |        4 | all `unknown` | same                                  | `raw/mcp-report.json`; `compat.scan` with `project: "."`                                             |
| DevEco host (native disk install)                | PASS               |        4 | all `unknown` | same                                  | `raw/plugin-report-candidate.json`; byte-identical to CLI                                            |
| Web viewer (local import, no upload)             | PASS               |        4 | all `unknown` | same                                  | `raw/web-readback.json`; target line reads “Scanner 0.1.0 · Schema 0.12.0”                           |
| CI action                                        | PENDING RUN        |        — | —             | —                                     | Retention step added in `.github/workflows/quality.yml`; the artifact is compared after the next run |
| VS Code host                                     | NOT-RUN this round |        — | —             | —                                     | 2026-11-15 record exists; not re-labeled                                                             |
| Cursor host                                      | NOT-RUN            |        — | —             | —                                     | Not installed on this host                                                                           |

MCP supplies its own read-back: the client saw the same finding IDs, rule IDs, statuses
and locations. Web supplies a projection only — it renders rows, not a raw report — so
the comparison is field-level, not byte-level. `parity-summary.json` records the
canonical projections and the equality result (`allCanonicalFieldsEqual: true` for CLI,
MCP and DevEco).

## Boundaries

- One host, one fixture, one frozen target tuple (`arkts` / HarmonyOS 6.0.0 / API 20).
- Byte identity proves the plugin’s subprocess output equals a separate CLI run; it is
  not a correctness or accuracy claim.
- No legal, licensing or account agreement was accepted, no user IDE profile or project
  was modified, and no release/tag/merge action is part of this evidence.
- Cursor remains `NOT-RUN` (not installed on this host); see the follow-up record.

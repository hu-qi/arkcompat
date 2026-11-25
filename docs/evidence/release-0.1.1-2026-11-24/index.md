# v0.1.1 patch verification · 2026-11-24

Scope: Issue #8/M6 and #6/#11, candidate `6658f92672b54d36a9a7aa42e392755e4f309bca`, [PR #125](https://github.com/hu-qi/arkcompat/pull/125). Publication was authorized by the owner in the 2026-11-24 conversation. Engineering preview only; formal acceptance stays 0/5 and work packages 2/8 (25%).

- Local `pnpm check`: 41 files / 608 tests pass; format, lint, typecheck, coverage and document integrity pass. New identity test first failed on the previous version. Five old report hashes reproduce when only the producer identity is restored.
- [Candidate CI](https://github.com/hu-qi/arkcompat/actions/runs/45310582238): 7/7 quality/package jobs pass; Linux/macOS double builds and archive verifier pass.
- CodeRabbit review completed with two minor release-note findings (Web Node version and downloading all checksum-listed assets). Both corrected before release. This automated review is advisory, not independent accuracy acceptance.
- Two local complete builds including DevEco match 8/8 files; [candidate verifier](candidate-verification.json) checks seven external digests, 1,072 internal CLI digests, archive safety, SBOM/notices and CLI/Web smoke. Final release source/tag and post-download checks are recorded after publication.

## Actual entry points · publication-time snapshot

This earlier 6/7 snapshot is preserved chronologically. The later same-day published DevEco host follow-up below completes the seventh host; use that section for latest status.

Frozen fixture: `yarn-berry-graph`, HarmonyOS 6.0.0 / ArkTS / API 20, four unknown findings.

| Entry point | New candidate result | Evidence / boundary |
| --- | --- | --- |
| CLI | PASS | Separate process; four unknown findings |
| MCP | PASS | Real stdio client; CLI canonical fields identical in [summary](parity-summary.json) |
| Web | PASS | Packaged standalone server; browser file import; [read-back](web-readback.json) identifies producer 0.1.1/schema 0.12.0 and four findings |
| VS Code 1.147.0 | PASS | VSIX installed in isolated extensions directory; [host harness](vscode-host.json) executes installed production command, verifies all four IDs/messages/severity/locations against CLI |
| Cursor 3.31.15 / extension API 1.128.0 | PASS | Official downloaded app signature verified; same VSIX and isolated host harness; [proof](cursor-host.json) |
| CI action | PASS | Downloaded artifact from run 45310582238; action output byte-identical to the separately captured CLI report |
| DevEco 26.0.0.865 | HOST NOT-RUN | ZIP and embedded/source CLI parity pass; this fresh isolated host stopped at its user/SDK agreement. Cancelled without accepting. Historical 2026-11-17 native-host record remains scoped to the older candidate. |

Current-round local semantic parity covers **6/7 hosts/surfaces (85.7%)**, on one authored fixture. This is not full lifecycle, independent accuracy or real-project acceptance. Cursor and VS Code results are separate hosts of the same VSIX.

The original DevEco application failed strict codesign with “resource fork, Finder information, or similar detritus not allowed”. An isolated APFS clone had extended attributes cleared and then passed strict signature validation. No signature check was bypassed and the user's installed app/profile was not modified. Candidate package bytes are bound by the verifier. The Web import hint still names schema 0.10.0; the actual parser/read-back correctly handles schema 0.12.0. This cosmetic pre-existing hint is retained as a known limitation.

CLI/MCP reports carry no compatibility claim. Six public knowledge candidates remain unreviewed/inactive. No holdout labels, human signature, Huawei acceptance, real-device/AOT or full-host uninstall verdict follows from this evidence.


## Published artifact verification

[v0.1.1](https://github.com/hu-qi/arkcompat/releases/tag/v0.1.1) is published at `f3c57e0e5f19832a9acf8111669f21377f9af46b`. [Release-commit CI](https://github.com/hu-qi/arkcompat/actions/runs/45311509077) passed 7/7 jobs. [Publication manifest](publication.json) binds the tag object, source, channels and denominators; [three-remote read-backs](release-refs.json) retain the publication-time refs. The [final double-build verifier](release-verification.json) confirms 8/8 file identity; all runtime assets also match the host-tested candidate bytes. The source kit was rebuilt from the final release commit.

[GitHub downloads](github-download-verification.json) and [AtomGit/GitCode downloads](atomgit-download-verification.json) each match all eight uploaded files, seven checksum-listed digests, 1,072 internal CLI digests, archive checks, provenance and CLI/Web smoke. AtomGit/GitCode API metadata returns the same repository ID 11253777, release commit and eight attachments; four additional auto-generated source archives are not included in the uploaded-asset denominator. One temporary DNS failure while downloading the last provenance assets recovered on a resumed GET; the final verifier passed. This is fresh extraction on the engineering host, not an independent reviewer clean-host acceptance.

Isolated VS Code and Cursor extensions were successfully uninstalled after their scans; see [VS Code uninstall](vscode-uninstall.txt) and [Cursor uninstall](cursor-uninstall.txt). [Fresh dependency audit](audit-summary.json) reports 243 dependencies and zero advisories at observation time. Formal acceptance remains 0/5.


## Published DevEco host follow-up · 2026-11-24

The owner reported completing native Install Plugin from Disk in the isolated host. Settings then showed **ArkCompat 0.1.1**, enabled; all **1,074 installed files** matched the published ZIP (`db3ccef1a3727329bdf87ffd0a5292df665027192c2342c42f2467f2f36173b3`). The recovered startup showed no agreement, and the agent accepted none.

[Host manifest](deveco-host/manifest.json) binds DevEco 26.0.0.865/build 261.23567.138.36.2600865, the published ZIP/JAR, fixture and screenshots retained locally. [Fresh CLI report](deveco-host/cli-report.json), [plugin report](deveco-host/plugin-report.json), [recovered report](deveco-host/recovered-report.json) and [post-restart report](deveco-host/restarted-report.json) are byte-identical (`f87df8cbf60068addf1c7afad1cf6ec4ca37cd2f83fb49aea6250a462022cebd`): four unknown findings, scanner 0.1.1, schema 0.12.0. [Canonical parity](deveco-host/parity.json) also matches the retained CLI/MCP snapshot.

“Open first finding” opened `package.json` at **5:21**. Temporarily removing the authored `package.json` and `yarn.lock` produced the explicit missing-inventory error; restoring unchanged bytes yielded the original report. A full IDE restart retained the plugin and produced another identical report. [Sanitized UI observation](deveco-host/recovery-ui.json) retains the navigation and error/recovery state. The fixture is not a complete HarmonyOS project, so IDE project-sync failure is a visible limitation rather than a plugin scan failure.

After shutdown, moving only the task-owned plugin directory aside and restarting removed the Tools action; [removal observation](deveco-host/removal-observation.json) records this. **Native UI uninstall is not established.** The plugin backup, isolated profile and raw screenshots remain locally available; regular IDE profiles were untouched and the isolated host was stopped.

Latest single-fixture semantic parity is now **7/7 hosts/surfaces (100%)**. This does not establish full host lifecycle acceptance, independent accuracy, device/runtime support or any formal result. Work packages remain **2/8 (25%)**, formal acceptance **0/5 (0%)**. No release code, tag or asset was changed by this follow-up.

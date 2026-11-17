# v0.1.0 review remediation and engineering CI closure · 2026-11-17

**Scope:** Issue #8 (M6 reproducible artifacts/install/docs), related #5, #6, #11.
**Published release:** unchanged. Tag `v0.1.0`, its assets and release body were not modified.
**Verdict:** local engineering gates pass; the release-packaging rehearsal now runs on Linux and macOS CI. This is **not** a release candidate verdict, not formal acceptance and not a new public patch release.

Machine-readable record: [`docs/evidence/release-0.1.0-ci-closure-2026-11-17/manifest.json`](evidence/release-0.1.0-ci-closure-2026-11-17/manifest.json). The 2026-11-15 [verification record](RELEASE-0.1.0-VERIFICATION.md) remains the historical description of the downloaded v0.1.0 assets; this document describes only the later engineering changes.

## 1. Review findings fixed

| Finding                            | Behavior before                                                                                                                                                                                                                     | Behavior after                                                                                                                                                                                                               | Regression evidence                                                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GNU-only tar flags                 | `scripts/package-release.mjs` called `tar --uid --gid --uname --gname`. GNU tar 1.35, the Ubuntu 24.04 version, exits 64 with `unrecognized option '--uid'`, so release packaging could not complete on the supported Linux runner. | Archives are written in Node as ustar + gzip with fixed mtime (1980-01-01T00:00:00Z, UTC epoch), uid/gid 0, `root` names, modes 0644/0755, sorted entry order, zero gzip timestamp, and rejection of symlinks/special files. | `tests/release-packaging.test.ts`; GNU tar 1.35 reproduction recorded in the manifest; Linux/macOS CI packaging job.                                                    |
| Schema fallback masked read errors | `readKnowledgeSchema` caught every read error and continued to the bundled fallback, hiding `EACCES`, `EISDIR` and I/O failures.                                                                                                    | Only `ENOENT` selects the next candidate. Other errors throw with the offending path, error code and cause; when every candidate is missing, the error lists each checked location.                                          | `tests/knowledge-schema.test.ts` covers missing primary with valid fallback, present primary, `EISDIR` not bypassed, `EACCES` not bypassed and both-absent diagnostics. |
| Packaging verification manual      | Rebuilds, checksums and safe-unpack checks were performed by hand.                                                                                                                                                                  | `scripts/verify-release.mjs` checks the expected artifact set, `SHA256SUMS`, archive path/entry-type/mode safety, extraction results, internal CLI checksums, SBOM/notices equality and optional CLI/Web smoke.              | Verifier runs twice per CI runner; tampered and missing artifacts fail locally.                                                                                         |

The web artifact prerequisite review found no new defect: the self-contained bundle already ships the knowledge schema next to its entry point, the server returns a diagnostic when assets are absent, and the VSIX ZIP normalizer rewrites entry order and timestamps while preserving ZIP structure. No web or ZIP code was changed in this round.

## 2. Engineering changes

- `scripts/deterministic-tar.mjs` writes archives without external `find`/`touch`/`tar`/`gzip` dependencies; `scripts/package-release.mjs` also gzips the source archive with Node's zlib.
- `packages/knowledge/src/schema-file.ts` isolates candidate resolution; `index.ts` supplies the two schema locations.
- `scripts/verify-release.mjs` is the reusable artifact verifier.
- `.github/workflows/quality.yml` adds a `release-package` job for `ubuntu-24.04` and `macos-15`, Node 24, pnpm 10.34.9 and `@vscode/vsce@4.1.0`.
- The existing five required jobs, coverage thresholds and branch protection were not changed.

## 3. Local packaging evidence

Two runs of `pnpm package:release` from the same clean commit on macOS 27.2.1 arm64 produced byte-identical SHA-256 values for all seven artifacts plus `SHA256SUMS`; `verify-release.mjs --compare` compared all 8/8 files. Exact hashes, sizes and the input commit are in the manifest.

`scripts/verify-release.mjs <dir> --deveco-expected=yes --smoke` passed:

| Check                                                  | Result                   |
| ------------------------------------------------------ | ------------------------ |
| Expected set (7 artifacts, including local DevEco ZIP) | PASS                     |
| `SHA256SUMS` entries verified                          | 7/7                      |
| Portable CLI internal checksums                        | PASS                     |
| Release SBOM/notices equal the CLI copies              | PASS                     |
| Archive path, type and mode checks                     | PASS                     |
| Extracted tree has no symlink/special file             | PASS                     |
| CLI `--version` and offline fixture scan               | PASS (`arkcompat 0.1.0`) |
| Web standalone server and page fetch                   | PASS (HTTP 200)          |

Negative checks: appending a byte to `arkcompat-web.tar.gz` failed with `SHA256SUMS mismatch`; deleting it failed with `Unexpected artifact set`.

The DevEco ZIP was produced because this host has DevEco Studio 26.0.0.865. Hosted CI runners do not, so the CI job passes `--deveco-expected=no`; an unexpected DevEco ZIP fails the expected-set check rather than being ignored.

## 4. CI packaging gate

The `release-package` job:

1. checks out the exact PR SHA and installs the pinned toolchain;
2. packages the release twice from the same clean SHA;
3. compares the two output trees byte-for-byte with `verify-release.mjs --compare` (portable per-file SHA-256);
4. runs `verify-release.mjs` with `--smoke`, which extracts CLI/Web outside the source tree, runs the provenance validator, `--version`, an offline scan and a Web server fetch;
5. retains `SHA256SUMS`, both verifier reports, toolchain versions and the first output tree under `release-packaging-rehearsal-not-release-<os>` for 14 days.

**Within-runner** reproducibility (identical bytes from two builds on the same runner) is required. **Cross-runner** equality is not required and is not claimed: Linux and macOS may legitimately produce different archive bytes. Cross-runner parity is functional (same expected set, passing verifier, same version and non-empty scan, Web HTTP 200). The job records per-runner hashes instead of asserting cross-OS identity.

First run: [Actions run 44041429819](https://github.com/hu-qi/arkcompat/actions/runs/44041429819) on head `16900c8` completed **success** for all seven jobs, including both release-package runners. Per-runner hashes are in the manifest. Comparing the two downloaded artifacts showed identical uncompressed CLI/Web tar payloads (all 27,677,184 CLI tar bytes), identical extracted CLI file sets/contents/modes and an identical VSIX; only the gzip-compressed tar bytes differ, consistent with different Linux/macOS zlib builds. That is reported as functional cross-runner parity, not byte identity.

## 5. Corrections to earlier evidence

- **F-04 attribution.** F-04 was a regression introduced by the identity fix in the candidate branch (`a52898c`), not a defect in the downloaded v0.1.0 assets. It is now presented separately in [RELEASE-0.1.0-VERIFICATION](RELEASE-0.1.0-VERIFICATION.md#9-defects-and-disposition).
- **Node prerequisite.** CLI and VSIX bundle JavaScript code and dependencies but no Node executable. The DevEco plugin's `lib/runtime/` is JavaScript executed by the IDE's `tools/node/bin/node`; it is not a bundled Node binary. README, [CLI-PACKAGE-REHEARSAL](CLI-PACKAGE-REHEARSAL.md) and [DEVECO-FEASIBILITY](DEVECO-FEASIBILITY.md) now say this explicitly.
- **Decisions not reopened.** D-05 (DevEco disk-install; marketplace deferred) and D-08 (MIT) remain closed. Windows packaging, public registry publication and signing/attestation remain optional follow-ups, not blockers introduced by this round.

## 6. Boundaries and remaining work

- No publish, tag, asset, release-body, Issue or merge operation is part of this round; the Draft PR is review material.
- Local gates and CI packaging are engineering evidence, not accuracy measurement. Huawei adjudication, independent labels, formal acceptance (0/5) and the knowledge-base delivery gate remain unestablished.
- Cursor and the DevEco host UI were not re-run; prior dated host evidence is not relabeled. GitCode read-back remains blocked by missing credentials.
- A new public patch release still requires the owner decisions listed in [RELEASE-0.1.0-FOLLOWUPS](RELEASE-0.1.0-FOLLOWUPS.md), including corrected release notes and publication authorization.

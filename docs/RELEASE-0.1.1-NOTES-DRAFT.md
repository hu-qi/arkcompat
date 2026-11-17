# DRAFT — corrected release notes for a future patch release

**Status:** draft only. Nothing here has been published. The published `v0.1.0` release
body and assets are unchanged. Publication requires owner authorization, a new tag and
assets, and the review items in [RELEASE-0.1.0-FOLLOWUPS](RELEASE-0.1.0-FOLLOWUPS.md).

Purpose: replace the three material misstatements in the published `v0.1.0` notes
(A-01) and describe the engineering fixes (F-01–F-04) without overstating support.

---

## ArkCompat 0.1.x (patch) — draft body

### What this is

ArkCompat is an **independent community project**. It is not a Huawei official product,
and the DevEco Studio plugin is not published or endorsed by Huawei. The supported
distribution route for the IDE plugin is installing the ZIP from disk through
**Settings → Plugins → gear → Install Plugin from Disk**.

### Fixes since v0.1.0

- **Identity (F-01).** The portable CLI, VS Code extension, Web viewer, DevEco embedded
  runtime, scanner, MCP server and SBOM now identify as `0.1.x`; `arkcompat --version`
  works. Previously shipped artifacts identified as `0.0.0` and `--version` printed
  usage.
- **Web artifact (F-02).** The standalone Web viewer starts outside the monorepo and
  serves `/` and `/api/knowledge/status`; the published artifact failed to start because
  `@arkcompat/knowledge` was missing.
- **Reproducible archives (F-03).** Release archives are written in Node with fixed
  order, timestamps, ownership and modes. Two builds from the same clean commit are
  byte-identical on the same runner. Cross-OS byte identity is **not** claimed: Linux and
  macOS may compress differently, and parity is functional (same artifact set, passing
  verifier, same version, non-empty scan, Web HTTP 200).
- **Report import (F-04).** The identity-fixed Web viewer again accepts reports produced
  by earlier `0.0.0` clients that use the same schema (`0.12.0`). Reports from other
  schema versions are rejected with a diagnostic.

### Requirements

- **CLI and VS Code:** JavaScript dependencies are bundled, but **no Node executable is
  bundled**. An operator-provided Node **22.13+ or 24** is required.
- **DevEco Studio plugin:** no Node binary is bundled either. The plugin runs its
  JavaScript runtime with the IDE's own `tools/node/bin/node` and targets the DevEco
  build recorded in the package descriptor.
- **Web viewer:** serves a local, static viewer; report files are read in the browser and
  are not uploaded.

### Third-party notices and audit scope

- `THIRD-PARTY-NOTICES.json` describes the **12 third-party runtime packages** bundled
  with the CLI and VSIX, and is labelled `assessment: file-inventory-only`. One retained
  `@yarnpkg/lockfile@1.1.0` entry has a missing license file and a supplemental upstream
  source reference.
- The repository audit covers **243 dependencies** across the whole workspace. That audit
  inventory is **not** the same set as the 12-package runtime notices. The published
  `v0.1.0` note said “243 dependencies” for the notices file; that was wrong.
- Legal disposition of the retained license gap and any further licensing or trademark
  review remain owner/legal decisions. No license change is proposed here.

### Verified support and limitations

- Verified on this host: CLI scan/explain/export; Web import and read-back; MCP stdio
  scan/explain/knowledge; the CI action; VS Code 1.146.0 (2026-11-15 record); and, on
  2026-11-17, the DevEco Studio 26.0.0.865 host through the disk-install route.
- The DevEco host run produced a report byte-identical to a separate CLI run on the same
  fixture and target (`4` findings, all `unknown`, schema `0.12.0`). It does not measure
  scan accuracy.
- **Cursor** was not run: it is not installed on the verification host.
- **Formal acceptance is not established (0/5).** Dependency-scan accuracy, substitute
  accuracy, incompatible-API recognition, missing-port identification and the
  replacement knowledge base have not been independently adjudicated. The curated
  knowledge snapshot contains candidate records only; no confident substitute is
  produced.
- Reports describe explicit local inventory. They do not assert HarmonyOS compatibility.

### Integrity

- `SHA256SUMS` covers the published artifacts. Signing/attestation is not in place; the
  checksum file is the integrity mechanism for this release.
- Rollback: the previous release's assets remain available; uninstall the VSIX/CLI and
  reinstall the prior version, and remove the DevEco plugin from the IDE's plugin
  directory.

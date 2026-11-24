# ArkCompat v0.1.1 — engineering preview patch

ArkCompat is an independent community project, not an official or certified Huawei product. This patch delivers the merged release fixes from PR #123 and consistent **0.1.1** producer/package/plugin identity. It is an engineering preview; **formal acceptance remains 0/5** and work-package completion remains **2/8 (25%)**.

## Changes since v0.1.0

- CLI, scanner, MCP, Web, VSIX, DevEco descriptor and workspace packages identify as 0.1.1; CLI supports `--version`.
- The Web archive starts independently of the source checkout, including the knowledge schema dependency.
- Archives use deterministic entries and metadata. Repeated builds on the same runner must match; cross-OS compressed-byte equality is not claimed.
- Web accepts earlier producer versions using report schema 0.12.0 and diagnoses unsupported schemas. Schema versions are independent of the package version.
- Release descriptions correct the earlier official-product wording, Node prerequisite and audit/notices denominator.

## Artifacts and requirements

| Asset | Usage / requirements |
| --- | --- |
| `arkcompat-cli-portable.tar.gz` | Portable JavaScript CLI; operator-provided Node 22.13+ (22 line) or Node 24 |
| `arkcompat-vscode.vsix` | Local disk installation in VS Code/Cursor; extension API ^1.128.0; configure a trusted Node path in User settings |
| `arkcompat-deveco.zip` | Install Plugin from Disk in DevEco Studio 26.0.0.865 on macOS arm64; executes JavaScript with IDE-provided Node |
| `arkcompat-web.tar.gz` | Local viewer; operator-provided Node 22.13+ (22 line) or Node 24; run `node server.mjs` after extraction |
| `arkcompat-source.tar.gz` | Source from the release commit; build with pinned pnpm and Node |
| `SBOM.cdx.json`, `THIRD-PARTY-NOTICES.json`, `SHA256SUMS` | Runtime provenance and integrity materials |

No Node executable is bundled. VSIX and DevEco are disk-install packages; marketplace and package-registry publication remain deferred. The Web server is local, and imported reports stay in the browser. MCP and CI remain repository entry points; they are not separately published registry packages.

## Verification and boundaries

The patch adds a negative identity regression across ten manifests, CLI and DevEco, and a new report hash record. Re-rendering the new reports with the old scanner identity reproduces all five historical report hashes. Historical evidence is retained in place.

CI performs format/lint/type/unit/fixture checks, document/workflow validation, action-to-CLI parity and Linux/macOS packaging verification. Release publication follows successful candidate checks and same-host double builds. Current host results, downloaded artifact checks and source/tag bindings are recorded separately as dated evidence; older host observations are not evidence for the new artifacts.

Public knowledge data contains six candidates and zero independently reviewed active mappings. Default inventory findings remain `unknown`. Independent holdout labels, formal accuracy, full runtime/device verification, complete host lifecycle acceptance and final adjudication remain open. A successful package or CI check establishes no accuracy or HarmonyOS runtime support.

Runtime notices cover **12 third-party packages**, while the historical repository audit covered **243 dependencies**; these are different inventories. Notices retain the Yarn license-file gap and supplemental upstream license source. Owner decisions recorded in DECISIONS remain in force; no new official-data import or trademark claim is made. See [follow-ups](RELEASE-0.1.0-FOLLOWUPS.md).

## Integrity and rollback

Download every asset listed in `SHA256SUMS`, then verify them with `shasum -a 256 -c SHA256SUMS` before installation. Signing/attestation is not supplied. Keep the previous installation and report files until smoke testing succeeds. To roll back, stop the local CLI/Web process, uninstall the new VSIX or remove the DevEco plugin, and restore the previous installation. v0.1.0 remains available as immutable historical evidence with its documented defects.

# Local VS Code development host

The source-run adapter adds **ArkCompat: Scan Local Workspace** to the command palette. It launches the repository CLI for a single local workspace and shows its findings as informational diagnostics in Problems. It preserves the canonical finding IDs and locations. It performs no automatic scan or upload and does not run workspace scripts.

Build the trusted ArkCompat checkout with `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm build`. In VS Code 1.128 or later on the 1.x line, use the development host with `--extensionDevelopmentPath="$PWD/apps/vscode"` and the folder to scan. Set `arkcompat.nodePath` in **User** settings to the absolute path from `node -p process.execPath` (Node 22.13+ on the 22 line or Node 24). Workspace settings cannot select the executable. Target settings are `arkcompat.runtime`, `arkcompat.release`, and `arkcompat.apiLevel` (0 omits the API level).

For a repeatable check on the installed macOS VS Code build, run from the ArkCompat checkout:

```sh
vscode_smoke=$(mktemp -d /tmp/arkcompat-vscode.XXXXXX)
cp -R fixtures/developer/source-api "$vscode_smoke/ArkCompatVsCodeProbe"
mkdir -p "$vscode_smoke/user/User" "$vscode_smoke/extensions" "$vscode_smoke/ArkCompatVsCodeProbe/.vscode"
printf '{"telemetry.telemetryLevel":"off","update.mode":"none","extensions.autoCheckUpdates":false,"extensions.autoUpdate":false,"security.workspace.trust.startupPrompt":"never","workbench.startupEditor":"none"}\n' > "$vscode_smoke/user/User/settings.json"
printf '{"arkcompat.nodePath":"./workspace-must-not-control-the-executable"}\n' > "$vscode_smoke/ArkCompatVsCodeProbe/.vscode/settings.json"
node apps/cli/dist/index.js scan "$vscode_smoke/ArkCompatVsCodeProbe" --runtime arkts --release 6.0.0 --api-level 20 > "$vscode_smoke/expected.json"
vscode_cli='/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
vscode_node=$(node -p process.execPath)
env -u VSCODE_IPC_HOOK_CLI -u VSCODE_PORTABLE \
  ARKCOMPAT_TEST_NODE="$vscode_node" ARKCOMPAT_TEST_REPORT="$vscode_smoke/expected.json" ARKCOMPAT_TEST_PROOF="$vscode_smoke/proof.json" \
  "$vscode_cli" --user-data-dir "$vscode_smoke/user" --extensions-dir "$vscode_smoke/extensions" --disable-extensions \
  --skip-welcome --skip-release-notes --extensionDevelopmentPath="$PWD/apps/vscode" \
  --extensionTestsPath="$PWD/apps/vscode/dist/host-test.cjs" "$vscode_smoke/ArkCompatVsCodeProbe"
```

The test must exit zero and write `proof.json`. The [recorded VS Code 1.144.1 arm64 run](evidence/vscode-local-host-2026-11-07.json) matched all 10 CLI IDs and locations and ignored the workspace executable override. The fixture findings remain `unknown`. This demonstrates source-run editor integration on that host. Other operating systems and compatibility accuracy still need separate verification. Installed host results are recorded below.

## Installable VSIX rehearsal · Issue #6 / M4

The packaged extension runs the CLI shipped inside the VSIX. It uses the same scanner and still reads the Node path from User settings. You can build a private VSIX with the official [VS Code Extension Manager](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#vsce) and install it in an isolated profile:

```sh
pnpm install --frozen-lockfile --ignore-scripts
out=$(mktemp -d)
npm install --prefix "$out/tools" --ignore-scripts --no-audit --no-fund --save-exact @vscode/vsce@4.1.0
pnpm package:vscode "$out/tools/node_modules/.bin/vsce" "$out/arkcompat-local.vsix"
code --user-data-dir "$out/user" --extensions-dir "$out/extensions" --install-extension "$out/arkcompat-local.vsix"
code --user-data-dir "$out/user" --extensions-dir "$out/extensions" /path/to/project
```

Set the Node path in the isolated profile, then run **ArkCompat: Scan Local Workspace**. The VSIX stages only the extension entry points, its manifest, README and license, and the [portable CLI](CLI-PACKAGE-REHEARSAL.md). The packaging command refuses to overwrite an existing VSIX. Delete the isolated profile and VSIX to undo the rehearsal.

On macOS arm64, an isolated VS Code 1.145.2 host installed and ran the VSIX without a sibling source CLI. The test harness verified the installed extension path and matched all 10 CLI finding IDs, severity, messages and locations on the authored fixture. The old source-only layout installed but returned no diagnostics under the same test. The production extension and development host both preserve the User-level executable policy, and every observed verdict remains `unknown`. This is a private local package. Marketplace publication, DevEco and other host platforms remain separate.

The 2026-11-11 provenance package added `runtime/SBOM.cdx.json`,
`runtime/SHA256SUMS` and its refreshed notices to the same VSIX structure.
Extracting that runtime and running the independent validator produced 13
components, 14 dependency entries and 1,033 verified files; the VSIX SHA-256 was
`5a2ddc89b4157e4aefd94ca7290c3514fc6dc25586bc6c7fe49865d1a3c962cb`.
This is packaging-layer verification of the [runtime provenance](RUNTIME-PROVENANCE.md),
not a fresh editor host or public install.


### Cursor local install

Cursor 3.29.15 on macOS arm64 reports extension API 1.128.0. The older VSIX required 1.144 and was rejected on install. The extension now declares `^1.128.0` and compiles against the available `@types/vscode` 1.120.0 definitions, below the declared floor. Use the same VSIX and isolated profile arguments above with the `cursor` executable. For the pinned local smoke, the official [Cursor download](https://cursor.com/download) signature was verified before use. One VSIX was installed in both Cursor 3.29.15 and VS Code 1.145.2; the two hosts matched the CLI's 10 finding IDs, messages, severity and locations and ignored a workspace override of the Node executable. All results remained `unknown`. Cursor registry publication, other versions and operating systems are outside this local observation.

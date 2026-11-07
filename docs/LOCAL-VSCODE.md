# Local VS Code development host

The source-run adapter adds **ArkCompat: Scan Local Workspace** to the command palette. It launches the repository CLI for a single local workspace and shows its findings as informational diagnostics in Problems. It preserves the canonical finding IDs and locations. It performs no automatic scan or upload and does not run workspace scripts.

Build the trusted ArkCompat checkout with `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm build`. In VS Code 1.144 or later on the 1.x line, use the development host with `--extensionDevelopmentPath="$PWD/apps/vscode"` and the folder to scan. Set `arkcompat.nodePath` in **User** settings to the absolute path from `node -p process.execPath` (Node 22.13+ on the 22 line or Node 24). Workspace settings cannot select the executable. Target settings are `arkcompat.runtime`, `arkcompat.release`, and `arkcompat.apiLevel` (0 omits the API level).

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

The test must exit zero and write `proof.json`. The [recorded VS Code 1.144.1 arm64 run](evidence/vscode-local-host-2026-11-07.json) matched all 10 CLI IDs and locations and ignored the workspace executable override. The fixture findings remain `unknown`. This demonstrates source-run editor integration on that host. Cursor, other operating systems, a packaged VSIX, and compatibility accuracy still need separate verification.

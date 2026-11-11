# ArkCompat DevEco adapter

This local development adapter adds one explicit **ArkCompat: Scan Current
Project** action under DevEco's **Tools** menu. It does not scan at startup.
The action uses DevEco's bundled Node executable and the portable ArkCompat CLI
embedded in the plugin, writes the canonical report to DevEco's private system
directory, then shows finding counts and actions to open the report or the first
source finding. The scan subprocess starts with an empty environment so host
`NODE_OPTIONS` or `NODE_PATH` values cannot alter execution.

Compatibility remains `unknown`. The adapter does not install project
dependencies, execute analyzed lifecycle scripts, upload reports or load
unreviewed knowledge.

Build and inspect a disk-install ZIP on the exact macOS DevEco Studio
26.0.0.865 build:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm package:deveco /Applications/DevEco-Studio.app /tmp/arkcompat-deveco-adapter
```

The command is host-specific because it compiles against the Java platform
archives in the verified DevEco application. It creates a new output directory,
builds the portable CLI again, compiles the adapter with the exact bundled JBR
and produces `arkcompat-deveco.zip` plus an isolated `launch.sh`. The isolated
route leaves the normal IDE profile and Plugins directory unchanged.

For the exact-host explicit-action smoke, add `--prestage` and use the signed
isolated application copy. The generated launcher pre-stages the authored
plugin in its own profile and passes a separate config, system, plugin and log
root. Open the generated fixture, choose **Tools → ArkCompat: Scan Current
Project**, then inspect the notification and private report. This mode is for
local verification; the ZIP remains the disk-installable artifact.

Public DevEco distribution still depends on Huawei's authoring SDK, trustlist,
signing and update policy. A local disk-install rehearsal is not a marketplace
release.

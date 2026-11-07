# DevEco Studio feasibility evidence · Issue #2

Current decision: **continue with an isolated, version-pinned local plugin route**. The exact macOS build can compile and load the ArkCompat probe. A first-run DevEco user/SDK agreement still gates scan-process and editor navigation verification; no shipped plugin or runtime compatibility result is established.

## Vendor route and version evidence · 2026-11-07

- Huawei's [self-developed plugin FAQ](https://developer.huawei.com/consumer/en/doc/harmonyos-faqs/faqs-compiling-and-building-66) now resolves: locally developed plugins can be loaded from disk and released plugins are subject to a trustlist. This answers the earlier retrieval blocker. It does not specify a public authoring SDK contract, trustlist onboarding, required signing or update route.
- Huawei's [26.0.0 platform change log](https://developer.huawei.com/consumer/en/doc/harmonyos-releases/ide-changelogs-2600/) identifies the underlying IntelliJ 2026.1.1/JDK25 transition and the need to adapt plugins. The [exact mainland release notes](https://developer.huawei.com/consumer/cn/doc/doccenter-release-notes/deveco-studio-new-features-2600/) list DevEco Studio26.0.0.865 and its corresponding HarmonyOS26.0.0 SDK/toolchain. This supports investigating the bundled platform API; it is not a Huawei guarantee for arbitrary IntelliJ or VS Code extensions.
- Local app `/Applications/DevEco-Studio.app`, bundle `com.huawei.devecostudio.ds`, product DS26.0.0.865, full build `DS-261.23567.138.36.2600865`, macOS arm64. App signing metadata names Huawei Device; `codesign --verify --strict` passed on this bundle. Product info declares IntelliJ launcher, and the bundled JBR reports25.0.2. HMS/OpenHarmony ETS component metadata both report `platformVersion: 26.0.0`, `apiVersion: 26`, Release SDK `26.0.0.105`. These are observed local installation details, not vendor support for every macOS version or a device/run result.
- [HarmonyOS6.0.0 release overview](https://developer.huawei.com/consumer/en/doc/harmonyos-releases/overview-600) identifies API20 as the project's minimum-version engineering reference. The installed SDK26 and this probe do not validate behavior on a 6.0.0 device, ArkWeb/React Native or the entire6.0.0+ scope.

## Isolated compile/package/load proof

[Probe source](../spikes/deveco/ProbeActivity.java) compiles with the exact installed JBR `javac -proc:none -Xlint:all -Werror` against the bundled platform jars. `ProjectActivity` and the editor/JSON APIs were checked against those jars; this is version-specific local linkage, not a separately distributed Huawei SDK. The JAR and ZIP include ArkCompat probe code/descriptor only; no vendor jars, SDKs, downloaded source or blind labels are included.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
node spikes/deveco/prepare.mjs /Applications/DevEco-Studio.app /tmp/arkcompat-probe-new
```

Choose a new output directory and paths without whitespace/quotes for the JVM options. The probe requires macOS arm64 and the exact observed application build. The standard JDK `jar` packer is used; set `ARKCOMPAT_PROBE_JAR` to the absolute path of a local JDK packer if needed (the tested packer is OpenJDK17, which only archives the JBR25-compiled classes). `prepare.mjs` checks the bundle and signature, builds an authored two-file fixture baseline, compiles the probe, packages the ZIP, and writes a reviewable `launch.sh`. The output is a private local rehearsal, not a release.

Run the generated `launch.sh` only after reviewing its exact app/fixture/profile paths. It launches the absolute IDE binary with separate config, system, plugins and log directories; the probe is pre-staged as an unpacked custom plugin in that isolated profile. Do not replace or update the user's usual IDE profile. The observed loader log says `Loaded custom plugins: ArkCompat Feasibility Probe (0.0.0)`. The Huawei UI's **Install Plugin from Disk** route is documented, but this smoke used an isolated plugin directory and did not exercise that UI.

The probe is inactive without the generated opt-in properties and the exact fixture project. It invokes the existing CLI as an argument-vector subprocess (no shell or analyzed source execution), with a 30-second wait and private report/error files. The authored fixture baseline contains two unknown findings; the API finding points to `main.ts:2:1`. The intended editor check is a verified caret location using the canonical finding, without implementing compatibility rules or changing its status.

```sh
cmp /tmp/arkcompat-probe-new/expected-report.json /tmp/arkcompat-probe-new/plugin-report.json
cat /tmp/arkcompat-probe-new/probe-result.txt
```

These verification commands are ready for the next run. A successful result requires byte-identical CLI and plugin reports and the actual editor caret marker (including the original finding ID and unknown status). At this observation, DevEco is waiting in its first-run agreement window and **neither plugin report nor editor marker exists**. The operator must personally read/decide on the DevEco User Agreement and HarmonyOS SDK License Agreement. Loading a plugin is not proof that its startup activity or editor path ran.

## Failures, recovery and go/no-go

1. Initial release/path inspection succeeded, then the `/Applications` bundle was temporarily absent/incomplete during the investigation. Compilation was first verified from the matching mounted installer and repeated against the restored exact installed bundle. No user app files or security settings were changed by the probe.
2. Launch by bundle identifier resolved to a different external-volume copy. Its bundled OpenHarmony plugin failed to initialize because an AppleDouble `._*.jar` sidecar was treated as a ZIP. The isolated probe was also rejected when its descriptor used the full DS build suffix; the verifier reported platform build `IC-261.23567.138`. Closed the task-owned failed instance. Did not modify that external app.
3. An absolute launch of the verified `/Applications` bundle with the exact platform range `261.23567.138` loaded the probe in a fresh isolated profile. First-run consent is the current gate; no further launch retries or agreement bypass. The full DevEco build remains checked by the prepare script independently of the manifest platform range.

**Local decision:** exact-build local compile/package/load is feasible; complete the scan/editor smoke after operator consent. **Distribution decision:** hold public publishing/signing/update claims until Huawei trustlist/onboarding requirements and an actual delivery route are verified. Windows, other IDE builds, diagnostics integration, actual HarmonyOS builds and independent acceptance are outside this evidence. No SDK redistribution or user data/AI upload was introduced. Issue #2 remains open until the promised process/editor proof and closure boundary are resolved.

Earlier November5 evidence consisted of two timed-out FAQ retrievals, named-vendor-plugin installation hints and no known local path. Those were earlier observations; the source, build and loading evidence above supersede them.

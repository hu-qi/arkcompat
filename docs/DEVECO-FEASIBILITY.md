# DevEco Studio feasibility evidence · Issue #2

Current decision: **continue with an isolated, version-pinned local plugin route**. The exact macOS build compiled, loaded and ran the ArkCompat probe; local scan-process communication and editor navigation were observed. Production plugin packaging/distribution and HarmonyOS runtime acceptance remain separate.

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

The operator personally read and accepted the first-run DevEco User Agreement and HarmonyOS SDK License Agreement in the isolated window. The probe then started the local CLI successfully. `cmp` verified identical report bytes; both SHA-256 values are `ad305851d732610cb09ee29c41dab7b447e62511afed46cad914819ff74ce9da`. The probe read the actual caret and recorded `main.ts:2:1`, finding `6a47b7649024f0fa4641ecd9c65bac07f5b549dcc65f03fbc15f59337cf5adf5`, status `unknown`. Native accessibility showed the editor and authored source; visual inspection showed `2:1` in the IDE status bar. The [observation record](evidence/deveco-local-probe-2026-11-07.json) carries the exact build, hashes and result.

The IDE also showed **Project sync failed** for this plain TS fixture, which has no HarmonyOS/Hvigor project. That banner is retained as a limitation: the proof is the local scan/JSON/editor path, not successful HarmonyOS project sync, build, SDK runtime verification or a released diagnostics integration. A process-scoped JVM-options notice was expected for the isolated profile. No default IDE settings were changed.

## Failures, recovery and go/no-go

1. Initial release/path inspection succeeded, then the `/Applications` bundle was temporarily absent/incomplete during the investigation. Compilation was first verified from the matching mounted installer and repeated against the restored exact installed bundle. No user app files or security settings were changed by the probe.
2. Launch by bundle identifier resolved to a different external-volume copy. Its bundled OpenHarmony plugin failed to initialize because an AppleDouble `._*.jar` sidecar was treated as a ZIP. The isolated probe was also rejected when its descriptor used the full DS build suffix; the verifier reported platform build `IC-261.23567.138`. Closed the task-owned failed instance. Did not modify that external app.
3. An absolute launch of the verified `/Applications` bundle with the exact platform range `261.23567.138` loaded the probe in a fresh isolated profile. After the operator accepted the first-run agreement personally, the scan/editor smoke passed. The full DevEco build remains checked by the prepare script independently of the manifest platform range.

**Local decision:** GO for exact-build macOS local development, CLI bridging and editor navigation. **Distribution decision:** hold public publishing/signing/update claims until Huawei trustlist/onboarding requirements and an actual delivery route are verified. The feasibility spike meets its viable-route criterion; production DevEco work remains tracked in [Issue #6](https://github.com/hu-qi/arkcompat/issues/6). Windows, other IDE builds, the disk-install UI, product diagnostics integration, actual HarmonyOS builds and independent acceptance are outside this proof. The probe neither redistributes SDK files nor issues model/network requests.

Earlier November5 evidence consisted of two timed-out FAQ retrievals, named-vendor-plugin installation hints and no known local path. Those were earlier observations; the source, build and loading evidence above supersede them.

## Install from disk verified · 2026-11-10 · Issue #6

Use `node spikes/deveco/prepare.mjs <verified-app> <new-output-directory> --disk-install` for the disk route. It builds the same authored JAR and ZIP while leaving the isolated `plugins/` directory empty. Start the generated launcher and in **Settings → Plugins → gear menu → Install Plugin from Disk** select `arkcompat-deveco-probe.zip`. Apply and restart using the same isolated launcher. After the test project opens, compare `expected-report.json` to `plugin-report.json` and inspect `probe-result.txt` as above.

On the exact macOS arm64 build `DS-261.23567.138.36.2600865`, DevEco's file chooser accepted the ZIP and queued installation. The queued copy matched the original SHA-256. Restart applied it into the previously empty isolated plugins directory. The installed JAR matched the packaged JAR, DevEco logged that it loaded the ArkCompat probe, and the plugin produced a byte-identical schema 0.8.0 report with two `unknown` findings. It opened the authored `main.ts` and recorded the canonical caret at `2:1`. The [disk-install observation](evidence/deveco-disk-install-2026-11-10.json) records the exact artifact hashes. The original probe preparation pre-staged the JAR; for this observation it was moved out of the plugins directory before launching. `--disk-install` now performs this separation during preparation.

The original app reported two disallowed Finder attributes on its emulator component. The test used an isolated copy after removing only those attributes from the copy and passing strict code-signature verification. The original bundle and usual IDE configuration were left alone. The copied app, plugin settings and logs were isolated; the ZIP contains no Huawei SDK or vendor files. This verifies one local disk-install route. Huawei's public trustlist, publisher onboarding, signing and update policy are still separate; no public plugin was submitted or distributed.

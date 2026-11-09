# HarmonyOS API 20 runtime probe · Issue #7 / M5

On 2026-11-09, two unsigned HAPs built with DevEco CLI 1.3.10 and SDK 26.0.0.105 installed and launched on an isolated HarmonyOS phone emulator. The [system API query](https://developer.huawei.com/consumer/en/doc/harmonyos-releases/app-compatibility-influence-factor/) returned release 6.0.0 and API 20; the device reported image build 6.0.0.48. Both HAPs declared minimum and target API 20. The compile SDK and the runtime are distinct.

- The baseline DevEco scaffold reached the UI and displayed **Hello World**.
- The candidate HAP loaded the exact, integrity-checked `@ohos/lottie@2.0.0` HAR, rendered an original blue circle animation on ArkUI Canvas and logged a loop completion. Two captures show distinct horizontal positions. Tapping **Destroy probe** changed the UI to **destroyed**, logged cleanup and removed the circle from the canvas.
- The task-owned emulator was stopped after collecting evidence. No existing device or emulator was used. The [observation record](evidence/harmonyos-api20-runtime-2026-11-09.json) includes exact artifact and capture hashes. Raw emulator images, packages, HAPs, logs and captures are not in the repository.

The same original animation also passed a local Web Canvas comparison in Ego Lite Chromium with the exact `lottie-web@5.12.2` player. In both environments the animation loaded, visibly moved, looped and cleaned up. The Web player uses a DOM container; the ArkTS player uses an ArkUI Canvas context. This establishes one developer-observed migration scenario and does not establish drop-in API equivalence, other rendering modes, device coverage, an accepted rule or any independent benchmark threshold. No knowledge record was added or promoted.

## Reproduce the two HAPs

Use a clean local directory, the pinned DevEco toolchain, and an operator-approved [HarmonyOS 6.0.0/API 20 phone image](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/ide-emulator-command-line/). Accept any required terms personally. Use separate emulator image and instance paths and a dedicated HDC port; do not reuse a real device.

```sh
repo=$PWD
work=$(mktemp -d)
devecocli create --app-name ArkCompatProbe --project-path "$work/ArkCompatProbe" --bundle-name com.example.arkcompatprobe --api-level 20 --device-types phone
devecocli create --app-name ArkCompatLottie --project-path "$work/ArkCompatLottie" --bundle-name com.example.arkcompatlottie --api-level 20 --device-types phone
cp "$repo/spikes/harmony-runtime/Index.ets" "$work/ArkCompatLottie/entry/src/main/ets/pages/Index.ets"
```

Obtain the exact `@ohos/lottie@2.0.0` HAR using [its OHPM release metadata](https://repo.harmonyos.com/ohpm/@ohos%2Flottie). Verify against the registry integrity and the observation record's SHA-256 before use. Place it at `ArkCompatLottie/libs/lottie-2.0.0.har` and set `dependencies["@ohos/lottie"]` in the candidate's `entry/oh-package.json5` to `file:../libs/lottie-2.0.0.har`. No package install or build is done by the scanner. The independent DevEco build below compiles the local probe.

```sh
for app in ArkCompatProbe ArkCompatLottie; do
  (cd "$work/$app" && devecocli build --assemble-type assembleHap --modules entry) || exit 1
done
```

For each generated `entry/build/default/outputs/default/entry-default-unsigned.hap`, inspect the packed `module.json`, confirm the local emulator serial/OS/API, then use [HDC](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/hdc/) with that exact serial:

```sh
hdc -t "$serial" shell 'param get const.product.os.dist.apiname'
hdc -t "$serial" shell 'param get const.ohos.apiversion'
hdc -t "$serial" install "$hap"
hdc -t "$serial" shell "aa start -b $bundle -a EntryAbility"
devecocli ui layout --device "$serial" --format json
```

Use the app's visible output and target logs, not the install exit alone. For the candidate, wait for **loop observed**, capture two frames with different circle positions, and use the button location from a fresh layout to trigger cleanup. Verify **destroyed** and the `probe_loaded`, `probe_loop` and `probe_destroyed` entries from `hilog -x -T ArkCompatLottie`. Stop only the isolated test instance. Build bytes can vary across reruns; record hashes of what was actually installed.

## Reproduce the Web comparison

Copy [the authored Web fixture](../spikes/harmony-runtime/web/index.html) and its [script](../spikes/harmony-runtime/web/probe.js) to a clean directory. Extract only `package/build/player/lottie.min.js` from the pinned [npm release archive](https://registry.npmjs.org/lottie-web/-/lottie-web-5.12.2.tgz) into that directory as `lottie.min.js`, and compare both hashes to the observation record. Serve only that directory on loopback and open the page in a local Chromium browser. The page uses a local-only content policy and no animation assets beyond the original fixture.

Verify **loop observed** and nonempty Canvas pixels at two frames with different circle positions. Click **Destroy probe** and verify the destroy event, status and removal of the Canvas element. This is a behavioral check of one original animation; it does not compare rendered pixels across different platforms.

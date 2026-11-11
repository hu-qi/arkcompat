# HarmonyOS API 20 target and runtime evidence · Issues #4 and #7 / M2 and M5

Two developer observations answer different questions and must not be combined:

- On 2026-11-09, the original probe ran on an actual HarmonyOS 6.0.0 / API 20
  emulator. That record proves installation, launch, rendered motion, looping
  and cleanup for the original probe, but its load and cleanup evidence is
  caller-log level.
- On 2026-11-11, the amended probe was packed into an API 20 target HAP and ran
  on an available HarmonyOS 7.0.0 / API 26 emulator. This record adds direct
  library-event evidence for load, sustained looping and cleanup, but is not an
  API 20 runtime replication.

The Web probe was rerun with the same authored animation on 2026-11-11. No
knowledge mapping was imported or promoted. The private candidate remains
inactive pending the amended public evidence and a human import decision.

## API 20 runtime observation · 2026-11-09

On 2026-11-09, two unsigned HAPs built with DevEco CLI 1.3.10 and SDK 26.0.0.105
installed and launched on an isolated HarmonyOS phone emulator. The
[system API query](https://developer.huawei.com/consumer/en/doc/harmonyos-releases/app-compatibility-influence-factor/)
returned release 6.0.0 and API 20; the device reported image build 6.0.0.48.
Both HAPs declared minimum and target API 20. The compile SDK and runtime
remain distinct.

- The baseline DevEco scaffold reached the UI and displayed **Hello World**.
- The candidate HAP used the exact, integrity-checked `@ohos/lottie@2.0.0` HAR,
  rendered an original blue circle animation on ArkUI Canvas and logged a loop
  completion. Two captures show distinct horizontal positions. Tapping
  **Destroy probe** changed the UI to **destroyed**, logged cleanup and removed
  the circle from the canvas.
- The task-owned emulator was stopped after collecting evidence. No existing
  device or emulator was used. The
  [observation record](evidence/harmonyos-api20-runtime-2026-11-09.json)
  includes exact artifact and capture hashes.

## Lifecycle amendment · 2026-11-11

Independent review found that the original ArkTS probe treated a synchronous
`loadAnimation` return as "loaded" and a caller-written log as "destroyed". The
current [probe](../spikes/harmony-runtime/Index.ets) now waits for the library's
`DOMLoaded` event and starts playback only after all public listeners are
registered. It uses the library's `destroy` event before the caller-return log,
records `enterFrame` frame and timestamp samples, and pins the original
animation to frame 0 and frame 18 for deterministic visual captures.

The packed HAP declares `minAPIVersion` and `targetAPIVersion` 60000020 and
contains `@ohos/lottie@2.0.0` at
`src/main/js/modules/full.js`. It ran on the isolated HarmonyOS 7.0.0 / API 26
phone emulator. The
[amended observation record](evidence/harmonyos-api20-target-api26-runtime-amendment-2026-11-11.json)
records the shared canonical animation payload SHA-256, `DOMLoaded`, 36
sustained `loopComplete` events, pinned frames 0 and 18, and `destroy`. The
ten-loop window was 10,005 ms. Frame centroids moved from x=527.5 to x=679.09;
the timestamped destroyed capture had zero matching Canvas pixels. The ability
dump and focused-window list confirm the page remained in the foreground, and
the task-owned instance was stopped afterwards. The selected
[54-line lifecycle log](evidence/harmonyos-api20-target-api26-runtime-lifecycle-2026-11-11.txt)
is included with its SHA-256. The log contains two frame-0 pin observations;
the record binds the screenshot to the second one because that timestamp
immediately precedes the committed capture. The earlier observation remains in
the log for completeness.

`complete` and `segmentStart` listeners were registered from the package's
public `AnimationEventName` union, but the looping default segment did not
trigger those events.

A Claude Code CLI review consumed only the public evidence in commit
`ea6b79e` and returned **support only with amendments** for the initial API 20
Canvas smoke. It did not review this 2026-11-11 amendment. The review requires
an explicit ArkTS loading lifecycle event, an independently observed ArkTS
destroy event, frame indexes and timestamps, real-device signed Release/AOT
coverage, a 100-cycle leak/stress audit and a complex-animation matrix before
recommendation. It excluded drop-in, SVG/HTML-renderer and production-readiness
claims. Model-result metadata shows that the CLI request for
`claude-opus-4-8` routed to
`geminigw/antigravity/gemini-3.8-flash[1m]`, so this is a Claude Code CLI review
with a model-routing mismatch, not an Opus review. Neither observation nor
review approves database activation, independent accuracy, production support
or formal acceptance. The operator-held review input/result hashes and decision
are recorded in
[the review evidence](evidence/claude-lottie-review-2026-11-11.json).

Two isolated attempts to review the amended evidence at commit `94544e32` also
failed before a model response. Each used the same public-only evidence bundle
(SHA-256 `d4769c52...`) with the private candidate and prior conclusions
excluded. The CLI returned `connection_failed` / `ECONNREFUSED` after 182599 ms
and 175176 ms respectively, with zero model usage and no review text. The result
hashes and failure metadata are retained in the review evidence. These attempts
are not evidence for or against the candidate and do not change its inactive
status.

This amendment does **not** replace the earlier API 20 runtime observation. The
API 20 image could not be recreated on this machine because its download endpoint
rejected the current non-mainland network location. The new result proves that
the revised API 20 target artifact runs on a later compatible runtime; it does
not prove behavior on the API 20 image. The build remained unsigned debug on an
emulator and still covers only one synthetic vector animation.

## Reproduce the HAP probes

Use a clean local directory and the pinned DevEco toolchain. Choose an
operator-approved
[HarmonyOS phone image](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/ide-emulator-command-line/)
and report its actual release and API level. Accept any required terms
personally. Use separate emulator image and instance paths and a dedicated HDC
port; do not reuse a real device.

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

Use the app's visible output and target logs, not the install exit alone. For
the candidate, wait for the library's **DOMLoaded** and **loop observed**
events. Pin **frame 0** and **frame 18**, capture each image, and use the button
location from a fresh layout to trigger cleanup. Verify the library-derived
`probe_domloaded`, `probe_frame`, `probe_loop` and `probe_library_destroy`
entries before the separate `probe_destroy_returned` caller log from
`hilog -x -T ArkCompatLottie`. Stop only the isolated test instance. Build bytes
can vary across reruns; record hashes of what was actually installed.

## Reproduce the Web comparison

Copy [the authored Web fixture](../spikes/harmony-runtime/web/index.html) and its [script](../spikes/harmony-runtime/web/probe.js) to a clean directory. Extract only `package/build/player/lottie.min.js` from the pinned [npm release archive](https://registry.npmjs.org/lottie-web/-/lottie-web-5.12.2.tgz) into that directory as `lottie.min.js`, and compare both hashes to the observation record. Serve only that directory on loopback and open the page in a local Chromium browser. The page uses a local-only content policy and no animation assets beyond the original fixture.

The 2026-11-11 rerun recorded one `DOMLoaded`, ten `loopComplete` events in
10,417 ms, pinned frames 0 and 18 with measured mean x 32 and 75.9927, and a
library `destroy` event. `canvasElementsAfterDestroy` was 0. The observation
record contains the event-log and screenshot hashes. A browser binary is
identified only by its reported user agent.

Verify **loop observed** and nonempty Canvas pixels at two frames with different
circle positions. Click **Destroy probe** and verify the destroy event, status
and removal of the Canvas element. This is a behavioral check of one original
animation; it does not compare rendered pixels across different platforms.

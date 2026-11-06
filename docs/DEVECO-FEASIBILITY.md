# DevEco Studio feasibility evidence · Issue #2

Status: **target/SDK confirmation required; no plugin shipping claim**. This is the M0 feasibility record, not an approval of a distribution route or replacement of DevEco with VS Code.

## Evidence gathered · 2026-11-05

- The official [DevEco FAQ index](https://developer.huawei.com/consumer/en/doc/harmonyos-faqs/faqs-deveco-studio) exposes a question about self-developed plugins. The linked [specific answer](https://developer.huawei.com/consumer/en/doc/harmonyos-faqs/faqs-compiling-and-building-66) timed out in two bounded retrieval attempts. Its answer has **not** been established by this audit; no SDK-support conclusion is inferred.
- Official search indexing for the [HarmonyOS Dev Assistant installation page](https://developer.huawei.com/consumer/cn/doc/start/hosdevassistant-install-deveco-0000002588359018) mentions installation from disk. Full-page retrieval timed out. That is evidence of an indexed procedure for that named product, not a general third-party authoring SDK, supported API/version matrix or approval to distribute ArkCompat.
- A read-only glob inventory under `/Applications` and `~/Applications` found no DevEco-named application. This is **not** an exhaustive machine search or evidence that the user has no installation elsewhere. No target executable/version was verified.
- No plugin was built, installed, signed, distributed or demonstrated in DevEco. No editor diagnostics/process integration was run. No IDE SDK or source was imported and no license accepted.

The available evidence is insufficient for a technical go decision. Current engineering decision: **hold the DevEco-specific implementation pending the target installation and supported SDK evidence**, while shared CLI/report/knowledge work continues. This is not a claim that third-party plugins are impossible.

## Concrete next verification

1. Obtain the target DevEco application path/version and official supported plugin SDK/version documentation. Record exact product/build IDs and applicable terms.
2. Review the supported plugin mechanism; do not assume IntelliJ or VS Code APIs merely because a UI or folder resembles them.
3. Build/install the smallest permitted plugin in that exact target and capture build/install logs. Keep source and packaging isolated from release artifacts.
4. Invoke the local TypeScript scanner through the confirmed API/process interface on an authored fixture. Verify canonical IDs/statuses and one-based file navigation; do not execute analyzed package/source code.
5. Confirm signing/update/distribution policy with the responsible human owner, then record go/no-go and Windows/macOS evidence separately. No automatic publication.

If SDK evidence or installation fails after three attempts at the same problem, preserve exact failures and reassess before proceeding. Issue #2 stays open: documenting missing information does not satisfy the requested install/process/location proof. Target-path/SDK and distribution questions were raised in the active task; no answer or sign-off is assumed from elapsed time.

# Descriptive evaluation harness · Issue #7 / M5

Private source-run `@arkcompat/evaluation`0.0.0 provides deterministic **generic binary judgment counts** and a local hashed evidence directory. It does not select/approve an official acceptance rubric, label samples, infer compatibility from inventory, verify independence, authenticate SDK/provenance or decide feature equivalence. Original80%/100% requirements and pending decisions are unchanged. Every result states `acceptance: not-adjudicated` and `independence: unverified`.

## Run the developer-only abstention example

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm evaluate fixtures/developer/evaluation/labels.json fixtures/developer/evaluation/predictions.json /absolute/path/to/a-new-evidence-directory
```

The3synthetic binary cases have3unknown predictions,2positive misses,0coverage,0recall,0accuracy and **null precision**. They are authored regression data, not independent labels or outputs from a live compatibility engine. The scanner remains inventory-only; the root declaration adapter below does not generate compatibility labels. No current accuracy/SDK/acceptance target is claimed.

Each input is strict version0.1.0 JSON, capped at2MiB UTF-8 and10000units. The [label fixture](../fixtures/developer/evaluation/labels.json) and [prediction fixture](../fixtures/developer/evaluation/predictions.json) show the complete shape. IDs must be unique and dataset IDs must agree. Predictions with unlabeled IDs are rejected, so the labeled universe cannot be silently expanded or reduced. Missing predictions count as unknown and remain in the denominator. Invalid extra fields/statuses, malformed JSON and non-UTF-8 input files fail; diagnostics do not reflect local paths or input payloads.

Labels carry a dataset ID, origin (`developer-fixture` or `external-unverified`), declared source/license/author/SDK/target context and a list of exact unit IDs, categories and expected positive/negative labels. Predictions carry the same dataset ID, recorded scanner/rule/knowledge versions and positive/negative/unknown judgments. These strings are **declared metadata**, not authenticated evidence. An external file cannot declare itself independently accepted through this schema.

## Generate root dependency predictions without labels

The following example uses an authored [case manifest](../fixtures/developer/dependency-evaluation/cases.json) that contains only case IDs, a target profile, and exact dependency section/name selectors. Generate predictions before supplying the separate [labels](../fixtures/developer/dependency-evaluation/labels.json):

```sh
out=$(mktemp -d)
pnpm --silent evaluate predict-dependencies fixtures/developer/inventory fixtures/developer/dependency-evaluation/cases.json > "$out/predictions.json"
pnpm evaluate fixtures/developer/dependency-evaluation/labels.json "$out/predictions.json" "$out/evidence"
(cd "$out/evidence" && shasum -a 256 -c SHA256SUMS)
```

The canonical scanner runs on the explicitly supplied project. One result is emitted for each unique case: `positive` means that exact root declaration was found in the specified section, and `negative` means the exact tuple was absent from a successful scan. If scanning fails, there is no prediction output. Duplicate IDs/selectors, fields carrying expected outcomes and malformed cases are rejected. This scope does not test version resolution, transitive dependencies, compatibility, substitutes or missing ports.

The prediction file contains the exact case-manifest hash and the canonical scanner JSON hash, plus scanner and snapshot identifiers. It omits package names and paths from the predictions themselves. These digests let an evaluator reproduce the inputs; the score command records them and does not authenticate them. It accepts bound results only against `root-dependency` labels. The developer fixture reports one true positive and two true negatives, including an absent package and a package in the wrong section. These are regression counts, not measured independent accuracy or a proposed acceptance denominator.

## Counts and denominators

For each category and the whole dataset, all labeled units are counted:

- `tp`: positive prediction on a positive label; `fp`: positive prediction on a negative label.
- `fn`: all positive-label misses, including explicit negative predictions **and unknown/missing predictions**. `abstainedPositive` is a disclosed subset of `fn`.
- `tn`: negative prediction on a negative label. Unknown negative-label units are counted separately in `abstainedNegative`, never as correct negatives.
- `abstained`: all explicit unknowns plus missing predictions; `missingPredictions` discloses the latter subset. `labeled = tp + fp + fn + tn + abstainedNegative`.
- Precision is `tp/(tp+fp)`; recall is `tp/positive`; accuracy is `(tp+tn)/labeled`; coverage is `(labeled-abstained)/labeled`; false-positive rate is `fp/negative`. A zero denominator yields **null**, never a vacuous100% result.

These are descriptive statistics over supplied binary judgments. A zero false-positive count with zero coverage is not proof of safe recommendations. Categories do not establish the official unit of judgment, sample composition, accepted threshold, partial-equivalence policy or minimum sample size. Independent reviewers must still adjudicate the actual dataset, expected classifications, target SDK/runtime and original requirements. There is no threshold/pass flag or automatic Issue closure.

## Local evidence artifacts

The command validates both inputs before creating an output directory. The directory must not exist; inputs are opened as regular non-symlink files and bounded even if growing. Files use exclusive creation and private permission requests (directory0700/files0600, subject to OS semantics). There are no source/script/package executions, registry/model requests, telemetry, uploads or overwrites.

- `labels.json` and `predictions.json`: exact validated input bytes, retained locally.
- `results.json`: deterministic counts, recorded metadata, exact UTF-8 input SHA-256 values and explicit limitations.
- `manifest.json`: SHA-256 values for those three files and unverified/not-adjudicated state.
- `SHA256SUMS`: hashes of the inputs, results and manifest. It does not hash itself or establish authenticity/sign-off.

Repeat runs with identical input bytes create byte-identical artifacts; no wall clock, host path or run ID is invented. Category ordering is stable. Input record ordering/whitespace remains part of the exact byte hashes. The optional API `evaluate(labelText, predictionText)` shares the CLI's count logic and validation.

Inputs/artifacts can contain sensitive or blind labels. Keep them under evaluator-controlled access; this tool does not publish them or certify they are safe to upload. Do not submit blind labels to an AI/model or public CI artifact. Only authored public developer fixtures enter this repository's regression suite. A local process racing output-directory contents is outside the stable-checkout trust boundary; this is not a multi-tenant sandbox. On disk/write failure a partial directory may remain: a successful command and complete manifest/checksums are required, then retry to a new directory after diagnosing the failure.

## Verification and remaining gates

Tests cover mixed errors, category/full denominators, all unknown/missing/empty data, duplicates/extra IDs, false approval fields, explicit external-unverified origin, exact hashes, output no-overwrite, deterministic bundles, symlink/size/UTF-8 failures and the actual built CLI. Evaluation source joins core/knowledge in the existing per-file coverage floors; it is not an independent benchmark denominator.

Rollback by reverting this scoped optional harness/CLI PR. No scan/knowledge schema migration or platform claim changes. Transitive dependency and compatibility prediction adapters, adjudicated rubric, independently labeled holdout, snapshot/SDK verification, release evidence and real acceptance remain open in #7/#8, with data/rules prerequisites in #3/#4.

The Linux Node24 quality job also regenerates and verifies the committed **developer-only** example before retaining its explicitly named non-acceptance artifact for14days. This is a checksum/CLI regression gate. It does not load an external or hidden dataset, evaluate scanner accuracy or approve the proposed acceptance formula.

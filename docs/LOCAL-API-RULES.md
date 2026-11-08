# Local static API rule evaluation · Issue #3 / M1

The opt-in evaluator applies a caller-supplied [rule snapshot](../packages/contracts/api-rules.schema.json) to the source API observations from the same deterministic scanner. The default `scan` output and its JSON 0.6.0 contract are unchanged. The advisory results use a separate JSON contract; no adapters enable these rules implicitly.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
sample=$(mktemp -d)
printf '{}\n' > "$sample/package.json"
printf 'import { sample } from "demo-library";\nsample();\n' > "$sample/main.ts"
node apps/cli/dist/index.js api-rules "$sample" --runtime arkts --release 6.0.0 --api-level 20 \
  --rules fixtures/developer/api-rules/snapshot.json
```

The [developer snapshot](../fixtures/developer/api-rules/snapshot.json) has one synthetic rule and a reserved example evidence URL. The example yields one observed call and one `potential-risk` with tier `rule-static`. Changing the release to `6.0.1` yields one `unknown`; omitting the API level also yields `unknown` with an explicit reason. None of this measures API support or detection accuracy.

Rules match the full module specifier, observed member path and call/construct kind, plus the exact HarmonyOS release (6.0.0 or later), runtime and API level. Optional syntax does not change which API was observed. Use the exact reported path, including the literal namespace segment `"*"` where present; it is not a wildcard. Rule matching performs no path rewriting, ranges, fallbacks or implicit API-level mappings. Missing context, an unmatched selector and multiple matching rules have distinct unknown reasons. The evaluator preserves all observations in order and discloses the full denominator, even for an empty result. It never emits a verified or compatible status.

Snapshots are limited to 1 MiB UTF-8 and 1,000 rules. Extra fields, duplicate rule IDs and URLs with credentials or query parameters are rejected. CLI inputs must be explicitly selected regular files and cannot be symlinks. The evaluator does not read rule files from the scanned project automatically, fetch evidence URLs or verify their contents. The output identifies declared source evidence as unverified and includes the snapshot ID and SHA-256 of the exact UTF-8 input. Treat paths and evidence fields as data and review output before sharing.

The implementation does not bundle or activate third-party rules. Reviewed evidence, SDK/build or runtime verification, additional API coverage, adapter integration and independently adjudicated accuracy remain open. Roll back by reverting this increment; existing inventory callers do not depend on the advisory report.

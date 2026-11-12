# Local static API rule evaluation · Issue #3 / M1

The opt-in evaluator applies a caller-supplied [rule snapshot](../packages/contracts/api-rules.schema.json) (`0.1.0` exact snapshots or `0.2.0` version-range snapshots) to the source API observations from the same deterministic scanner. The default `scan` output uses the separate JSON 0.12.0 inventory contract. The advisory results use a separate JSON contract; no adapters enable these rules implicitly.

A public-documented HarmonyOS 6.0.0+ / API 20+ static rule snapshot is maintained in [the HarmonyOS 6.0 API 20 ruleset](../data/rules/harmonyos-6.0-api20-rules.json) covering Node built-in and Web/Node host-global boundaries across `arkts` and `arkweb`.

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

In `0.1.0` snapshots, rules match the full module specifier, exact observed member path (treating `"*"` literally), call/construct kind, and exact HarmonyOS release (6.0.0 or later), runtime, and API level. In `0.2.0` snapshots, rules declare a semver `releaseRange` (`>=6.0.0`), `minApiLevel`/`maxApiLevel` bounds, explicit `pathMatch` (`exact`, `prefix`, or `module`), `kind` (`call`, `construct`, or `any`), `classification` (`incompatible`, `conditional`, or `potential-risk`), integer `priority`, `rationale`, and `recommendedAction`. Higher `priority` resolves deterministic precedence across overlapping rules; equal-priority overlaps withhold as `ambiguous-rule`. Missing context, an unmatched selector, and equal-priority overlaps have distinct `unknown` reasons. The evaluator preserves all observations in order and discloses the full denominator, even for an empty result, and always keeps `tier: "rule-static"` (never claiming runtime-verified compatibility).

Snapshots are limited to 1 MiB UTF-8 and 1,000 rules. Extra fields, duplicate rule IDs and URLs with credentials or query parameters are rejected. CLI inputs must be explicitly selected regular files and cannot be symlinks. The evaluator does not read rule files from the scanned project automatically, fetch evidence URLs or verify their contents. The output identifies declared source evidence as unverified and includes the snapshot ID and SHA-256 of the exact UTF-8 input. Treat paths and evidence fields as data and review output before sharing.

The implementation does not bundle or activate third-party rules. Reviewed evidence, SDK/build or runtime verification, additional API coverage, adapter integration and independently adjudicated accuracy remain open. Roll back by reverting this increment; existing inventory callers do not depend on the advisory report.

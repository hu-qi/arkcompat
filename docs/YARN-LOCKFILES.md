# Yarn Classic descriptor graph · M1 / Issue #3

The [Classic lockfile format](https://classic.yarnpkg.com/lang/en/docs/yarn-lock/) can assign multiple selectors to one record. ArkCompat now reads root `yarn.lock` files with an explicit `# yarn lockfile v1` header, using the official pinned `@yarnpkg/lockfile@1.1.0` parser (BSD-2-Clause) and development typings. Package name/range descriptors are inventory references; the format does not provide an actual hoisted installation tree or resolved peer context.

## Reproduce

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/yarn-graph --runtime arkts --release 6.0.0
```

The authored fixture produces four logical selector nodes and six edges: a scoped alias, two selectors sharing a record, a missing optional dependency and an unsupported root peer. Never install or execute the fixture. The separate real smoke used Yarn 1.22.22 with three synthetic manifest declarations (`is-even`, `is-odd`, and an `is-odd` alias), yielding eight selector nodes and nine locked edges. Smoke setup installed packages only in a temporary directory with scripts/bin links disabled and removed it afterward; the scanner itself never installs or executes packages. These are regression observations, not independent compatibility accuracy.

## Experimental contract 0.12.0

- Source now accepts `yarn.lock`, Classic version is 1, and coverage is `yarn-classic-lockfile-partial`. Existing npm and pnpm graph shapes remain; earlier 0.1–0.4 consumers must update for expanded source/coverage and ID semantics.
- Node IDs are `yarn:<full-selector>`, not filesystem paths. Grouped selector headers are expanded by the official parser into distinct logical nodes. Selectors with the same recorded version are retained separately; node counts must not be interpreted as installed package counts.
- `installName` retains the selector's requested name; a scoped `npm:` alias carries the actual registry name in `name`. Registry ranges/tags and aliases are supported; local/Git/URL/patch/workspace references are unsupported and never become report IDs.
- Edges require an exact `name@specifier` key. Missing descriptors remain missing even when another selector has the same package name or a seemingly matching locked version. A recorded target whose version disagrees with a standard semver range becomes `mismatch` while retaining its node ID. Tags and non-semver selectors remain unchecked. No name-only reconciliation, installation/hoisting verification or registry lookup occurs. Recorded versionless nodes are unsupported targets.
- Effective optional dependencies override same-named ordinary dependencies; raw root declarations retain both sections. Missing optional edges remain visible. Classic does not record resolved peer contexts; root or extra declared peer edges remain unsupported and are never guessed from a sibling selector.
- `locked` means the exact descriptor has a record and any standard semver range was satisfied. Tags and non-semver selectors remain unchecked. All compatibility findings remain unknown. Manifest/lock mismatch cannot be fully adjudicated because Classic has no root importer with original declarations; unmatched root references are visible as missing edges.

## Input selection and failure policy

The shared selector honors an explicit npm/pnpm/Yarn packageManager when multiple supported families exist. Without one selecting a present family, scanning fails as ambiguous. A single family is selected directly; npm shrinkwrap precedence still applies. Ignored lockfile content is not parsed.

Berry files with `__metadata` now dispatch to the separate [v8 adapter](YARN-BERRY-LOCKFILES.md); other versions remain unsupported; future Classic versions and headerless/unrecognized formats yield declaration-only coverage with explicit limitations. They are never passed off as parsed Classic graphs.

Unterminated quoted strings are rejected before invoking the legacy parser to avoid slow malformed-input paths. For recognized v1 files, malformed input, invalid entry/dependency types, merge conflicts or repeated descriptors across entries abort with a sanitized `yarn.lock` diagnostic and empty stdout. The official parser is also used to understand grouped/quoted header keys for duplicate detection. Expanded selector tables are limited to 10,000, edges to 20,000, lines to 16,384 characters and indentation to 128 characters. The existing 1 MiB/file, total-read, symlink and stable-checkout policies apply. Dependency map duplicate semantics within one entry follow the pinned Classic parser; this is not a general lockfile auditor.

Only registry-safe descriptors become IDs. Resolved URLs/integrity values are not serialized, and URL/local dependency specifiers are redacted. Raw parser tokens are never forwarded in errors. Parser integration uses explicit CommonJS loading so CLI and test runners agree on its exports.

## Remaining M1 work

Other Berry versions/older pnpm, unrecorded Classic workspace links, tags/non-semver range evaluation, peer/hoisting verification, API/symbol analysis, compatibility rules and independent acceptance remain open. Selected workspace manifests receive exact external descriptor projections with standard semver reconciliation through the separate [Yarn workspace adapter](YARN-WORKSPACES.md). The shared fixture/schema/CLI tests cover npm, pnpm and Classic together, but do not establish the ≥80% dependency scanning acceptance target or a shipped release.

Schema 0.5.0 adds [source API call inventory](SOURCE-API-INVENTORY.md) alongside the existing lockfile graph; compatibility remains unknown.

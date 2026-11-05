# Legacy baseline audit · 2026-11-05

Issue #9 / M0-M1. Audited [legacy PR #2](https://github.com/hu-qi/ohpm-npm-compat-assistant/pull/2) at **621e97984393c43acbc344fa0b154ed37726b2fc**. Decision: **do not import the legacy implementation or knowledge data**. Continue independent implementation through ArkCompat contracts. No repository-license or Huawei-data-reuse decision is inferred.

## Reproduction and scope

The old PR was checked out separately in a temporary directory. Package scripts, compiler settings, data-copy script and test filesystem/process operations were inspected before execution. Installation ignored lifecycle scripts; the reviewed test command compiled source, copied local JSON into its own dist directory and ran Node tests. No scanned fixture source or fixture lifecycle script was executed; the working tree remained unchanged.

Node **22.23.4**, TypeScript **5.9.3**, pinned old package-lock. Actual result: **24 tests, 24 passed, 0 failed/skipped**. This reproduces the unit-test claim, not the old PR's 100% compatibility claim. [Machine-readable observations](evidence/legacy-audit-2026-11-05.json) record five authored probes, two disjoint public scans and full counts. These are not blind benchmark labels.

```bash
git clone https://github.com/hu-qi/ohpm-npm-compat-assistant legacy-audit
cd legacy-audit
git checkout 621e97984393c43acbc344fa0b154ed37726b2fc
# Inspect package.json, scripts/copy-data.mjs and tests first.
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Each probe used a fresh temporary main.ts and the built scanSource(root) export; inputs were never executed:

| Probe | Boundary | Observed legacy result |
|---|---|---|
| Import fs, then call a local parameter's readFile | Exclude shadowed local site | One fs.readFile usage, no warning |
| Type-only readFile import followed by value call | Exclude runtime attribution | One fs.readFile usage, no warning |
| import(privateVariable) | Retain unresolved reference/limitation | Zero references and zero warnings |
| Synthetic token URL and payload argument | Redact URL and omit argument excerpt | Synthetic canary retained |
| Truncated function declaration after import | Report syntax failure | Import returned, zero warnings |

These are mechanical inventory boundaries, not HarmonyOS SDK labels. The pinned [source analyzer](https://github.com/hu-qi/ohpm-npm-compat-assistant/blob/621e97984393c43acbc344fa0b154ed37726b2fc/src/scanner/source.ts) indexes bindings by spelling, records snippets and does not reject syntax diagnostics, explaining the probes.

## Disjoint public inventory observations

No public dependencies were installed or public source executed. Both scanners read source/manifest data, including tests under their current policies. ArkCompat baseline: **ab59b13fd0f6f112f2839ca658667d6f8e17adf9**.

| Repository / pinned commit | Root declarations old/new | References old/new | API sites old/new | ArkCompat source files |
|---|---:|---:|---:|---:|
| [p-limit](https://github.com/sindresorhus/p-limit/tree/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb) | 7 / 7 | 24 / 24 | 218 / 161 | 6 |
| [yocto-queue](https://github.com/sindresorhus/yocto-queue/tree/72a8fa96a9d389765cdf2bb9c6daba8302fc375d) | 3 / 3 | 4 / 4 | 16 / 16 | 4 |

Old API counts include properties/globals; ArkCompat counts potential imported calls/constructors. Differences are **not** TP/FP/FN, precision/recall or evidence that either count is correct. No independent runtime annotations were supplied. Reproduce with these exact public commits and each built scanner API, comparing the fields in the evidence JSON.

## License, provenance and version audit

The pinned [LICENSE](https://github.com/hu-qi/ohpm-npm-compat-assistant/blob/621e97984393c43acbc344fa0b154ed37726b2fc/LICENSE) and package metadata declare MIT, copyright 2026 hu-qi. This establishes the stated repository license, not independent rights/origin evidence for every data assertion. No license text or legacy code was copied into ArkCompat.

The matrix has **99 entries**, replacements **44 entries**; **0/99 and 0/44** record per-entry source/evidence/reference/URL fields. Replacement rows lack reviewed feature/version/runtime equivalence. The rule engine matches API strings; requested HarmonyOS version is report metadata rather than an applicability filter. Native-addon heuristics and mappings do not establish build/runtime support or universal absence. The accuracy module treats empty denominators as 1; authored labels cannot establish independent acceptance.

## Subsystem decisions

| Subsystem | Decision | Reason / route forward |
|---|---|---|
| Dependency reader | Rewrite; no copy | Flat name/version storage differs from canonical logical graph; retain aliases/peer contexts/unknown edges |
| AST analyzer | Reject copy | Demonstrated shadow/type-only/privacy/diagnostic gaps; retain lexical-symbol-aware bounded analysis |
| Compatibility rules | Reject as verified rules | No runtime/profile applicability evidence; reviewed evidence must precede support claims |
| API matrix / replacements | Reject import | Missing per-entry provenance/version equivalence; no recommendation may derive from these rows |
| Reports / CLI | Independently implement | Product requirements may inform behavior; source and incompatible schema are not ported |
| Accuracy labels / metrics | Reject as acceptance | Authored overlapping cases; preserve only reproduced unit-test result |
| Test/workflow concepts | Rewrite cases as needed | New cases state intended behavior and origin; old green tests are not a quality guarantee |

This completes the reuse audit decision, **not** legacy adoption or M0/M1 product acceptance. Future copying/import needs a new scoped review with attribution/data rights and regression/SDK/profile evidence as applicable. Close the audit after PR/main checks and GitHub/AtomGit read-back. Independent benchmark execution remains tracked by #4/#7.

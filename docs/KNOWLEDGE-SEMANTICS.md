# Offline knowledge metadata processing · Issue #4 / M2

The private `@arkcompat/knowledge`0.0.0 package adds semantic validation, conservative metadata matching and deterministic JSON export to [schema0.1.0](KNOWLEDGE-CONTRACT.md). It imports **no real mapping dataset**. The existing authored synthetic candidate remains the only fixture; scanner knowledge stays `none`, findings stay unknown, and MCP/Web do not load this package yet.

## CLI export

After a frozen install and build, pass a local knowledge snapshot explicitly:

```sh
node apps/cli/dist/index.js knowledge-export fixtures/developer/knowledge/snapshot.json
```

The command writes only canonical JSON to stdout, including candidate and historical records. The built-in example is synthetic. Redirect to a new destination if you need a file; do not redirect back to the input path. The command accepts regular UTF-8 files up to 2 MiB, rejects symlinks and invalid metadata, and writes no JSON on failure. It fetches no data, does not authenticate the evidence, and does not activate the snapshot in the scanner. The same input yields the same bytes on repeated runs.

## Library import and export

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { importKnowledge, exportKnowledge } from './packages/knowledge/dist/index.js';
const snapshot = importKnowledge(await readFile('fixtures/developer/knowledge/snapshot.json', 'utf8'));
process.stdout.write(exportKnowledge(snapshot));
JS
```

`importKnowledge(text)` parses JSON data and applies the existing offline AJV schema plus semantic checks. `exportKnowledge(object)` revalidates a fresh JSON copy, sorts records by ID and object keys by code-unit order, retains array order inside records, and emits two-space JSON with a final newline. Candidate/expired history is retained rather than silently deleted or renewed. Input and canonical output must both fit2MiB UTF-8; snapshots are capped at1000records and each semver selector at256characters. Invalid JSON, structural or semantic data produces a stable generic error without reflecting source fields. There are no network requests, source execution or package scripts.

Additional semantic checks:

- Canonical UTC calendar timestamps (`YYYY-MM-DDTHH:mm:ssZ`), rejecting normalized invalid dates,24:00, leap seconds, offsets and fractions. Leap days are checked by actual calendar normalization.
- Provenance/review cannot postdate snapshot generation; review cannot precede its evidence; expiry must follow every evidence/review timestamp. A historical snapshot may be generated after a record expires.
- IDs are unique across records even when bodies differ. Identifiers/attribution/features cannot be blank, padded or contain control characters. Included and excluded feature scopes cannot overlap.
- Source/target/release selectors must be satisfiable semver ranges. Registry tags, workspace/git selectors, blank/oversize/reversed ranges are rejected. Matching uses pinned npm `semver`7.8.6, strict parsing, no coercion/loose mode and default prerelease exclusion. [Upstream API/range documentation](https://github.com/npm/node-semver) defines these operations. No registry release existence is inferred from a valid range.

Schema conditional feature branches now explicitly state object/array types to eliminate AJV strict-type warnings; these annotations do not change the previously accepted record shapes or schema version.

## Query with an explicit reproducibility date

```js
import { queryKnowledge } from './packages/knowledge/dist/index.js';
const result = queryKnowledge(snapshot, {
  package: 'synthetic-source',
  version: '1.2.0',
  target: { os: 'HarmonyOS', release: '6.0.0', runtime: 'arkts', apiLevel: 20 }
}, '2026-11-07T00:00:00Z');
```

Requests require exact semver source/release versions and known runtime, not range selectors or inferred latest versions. API Level must exactly equal the recorded context; an omitted API Level cannot match, and no OS→API/minimum-level assumption is made. Unknown recorded runtime is not a wildcard. All input objects are revalidated on each query/export; callers cannot mutate imported metadata to bypass checks.

Every query returns `status: unknown`, snapshot ID, SHA-256 of canonical export bytes, full snapshot count, count considered for the exact package name, matching metadata records and per-record exclusion reasons. Full/partial feature scope and provenance are preserved. The existing candidate fixture has zero matches and `not-reviewed`; it is not promoted by schema validity. No query result makes a recommendation.

Reasons accumulate rather than hiding misses: not-reviewed, expired (including exact expiry instant), snapshot-not-yet-available, source-version-mismatch, runtime-mismatch, release-mismatch and api-level-mismatch. Records for other package names are counted in the full denominator but not returned as exclusions. Zero name matches establishes only absent metadata, not a missing port.

If more than one otherwise eligible record matches, **all** are withheld as ambiguous-match. This deliberately conservative lookup does not rank alternatives, infer equivalence, combine feature scopes or compute a global range-conflict proof. Nonoverlapping version/profile records can coexist; expired/candidate competitors remain excluded with reasons. Conflict detection is for the exact query, not a claim that the whole dataset is globally conflict-free.

## Release evidence

The [offline OHPM capture adapter](OHPM-RELEASE-EVIDENCE.md) can project an exact release observation from a caller-supplied metadata file. It produces separate evidence and does not import or activate a knowledge mapping.

## Completion boundary

A matching reviewed record is still **metadata only**. License strings, reviewer names, URLs and stated availability are not authenticated. No source freshness refresh, registry lookup, feature-equivalence assessment, runtime/build validation or independent benchmark is performed. No licensed curated adapter, supported package export/distribution, verified replacement recommendation or M2 exit gate is declared.

Developer regression fixtures cover these boundaries, including candidate/expiry/partial/conflicting metadata and canonical round-trip hashes. Coverage now includes both shared core and knowledge package with the existing per-file floors; adding this denominator does not establish real-world accuracy. Original scan schema0.5.0 and snapshots-none tests remain unchanged. CI evidence is recorded in the PR/Issue after required checks pass.

Rollback by removing consumers of this optional package or reverting this scoped PR; no scan-report data migration is needed. Remaining licensed data/refresh policy, independent labels and adjudication stay tracked in #4, with engine activation in #3 and acceptance in #7/#8.

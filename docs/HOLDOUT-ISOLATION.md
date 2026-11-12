# Independent Holdout & Label Isolation Policy · ArkCompat (Stage 2 / B8)

**Status:** Active harness policy (2026-11-12). Independent labeled holdout datasets are not yet supplied (`A5` pending); developer fixtures under `fixtures/developer/` are regression-only and excluded from formal acceptance claims.

## 1. Separation of Datasets

| Dataset Tier | Location | Purpose | Allowed in Formal Acceptance? |
|---|---|---|---|
| **Developer regression fixtures** | `fixtures/developer/**` | Unit, integration, parity, and regression checks | **No** (`origin: "developer-fixture"`) |
| **Independent blind holdout** | External/authorized path pinned by SHA-256 manifest at `D1`/`D2` | Formal >=80% / 100% adjudication | **Yes** (once `A5` adjudicator, license, and provenance are recorded in `DECISIONS.md`) |

## 2. Label-Blind Prediction Contract

All five prediction adapters in `@arkcompat/evaluation` (`apps/evaluate/dist/index.js`) enforce strict label isolation:

| Scope (`binding.scope`) | CLI Subcommand | Blind Input (`cases.json`) | Expected Label Category |
|---|---|---|---|
| `root-declaration-presence` | `predict-dependencies <project> <cases.json>` | `{ id, section, name }` | `root-dependency` |
| `dependency-graph` | `predict-dependency-graph <project> <cases.json>` | `{ id, modulePath, kind, section?, name, resolvedVersion? }` | `dependency-graph` |
| `incompatible-api` | `predict-apis <project> <cases.json> <rules.json>` | `{ id, path, line, column, module, apiPath, kind }` | `incompatible-api` |
| `replacement-mapping` | `predict-replacements <cases.json> <snapshot.json> <as-of>` | `{ id, package, version, requiredFeatures?, targetRegistry, targetName }` | `replacement-mapping` |
| `missing-port` | `predict-missing-ports <cases.json> <snapshot.json> <as-of>` | `{ id, package, version }` | `missing-port` |

1. Every `cases.json` schema sets `additionalProperties: false`: embedding `expected`, `label`, or adjudicator notes causes prediction generation to fail immediately.
2. Every generated `predictions.json` embeds a cryptographic `binding` (`scope`, `casesSha256`, and `scanReportSha256` / `rulesSha256` / `knowledgeSha256`).
3. `evaluate(labels, predictions)` verifies `datasetId` equality, checks that every label `category` matches the bound `scope`, rejects missing/duplicate/extra predictions, counts abstained positives as `FN`, and refuses to turn zero recommendations into 100% precision.
4. Blind holdout ground-truth labels must remain outside public CI logs and public build artifacts (`D8`).

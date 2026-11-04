# Monorepo Layout & Build Strategy

**Principle:** One TypeScript core, multiple thin adapters. The structure below is a **target architecture**, not currently implemented.

```text
arkcompat/
├── apps/
│   ├── cli/                    # hcompat CLI, local scans
│   ├── vscode-extension/       # VS Code / Cursor diagnostics & code actions
│   ├── web/                    # report and knowledge-base explorer
│   └── mcp-server/             # structured agent tools
├── integrations/
│   ├── deveco-plugin/          # SDK-feasibility-gated IDE integration (may use Kotlin/Java)
│   └── github-action/          # uses CLI, never a second analysis engine
├── packages/
│   ├── contracts/              # public types, JSON Schemas & diagnostics
│   ├── core/                   # orchestrator, target context, findings
│   ├── dependency-analyzer/    # npm, pnpm, yarn, OHPM adapters
│   ├── source-analyzer/        # JS/TS AST, API references
│   ├── rules/                  # version/target-aware compatibility rules
│   ├── knowledge/              # curated port/replacement mapping
│   ├── verification/           # build/runtime evidence adapters
│   ├── ai-advisor/             # optional evidence-constrained AI advice
│   └── report/                 # JSON / Markdown / SARIF / HTML adapters
├── datasets/
│   ├── rules/                  # versioned compatibility matrices
│   ├── mappings/               # reviewed replacement knowledge
│   └── provenance/             # source metadata, review status
├── fixtures/
│   ├── developer/              # ordinary regression fixtures
│   └── holdout/                # separate controlled evaluation
├── tests/
│   ├── integration/
│   ├── parity/
│   └── benchmark/
├── docs/                       # PRD, ADRs, roadmap, eval, guides
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
├── AGENTS.md
├── ROADMAP.md
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## Package interfaces

- `@arkcompat/contracts`: pure data types and schemas; no dependency on application interfaces.
- `@arkcompat/core`: orchestrate analyzers with injected data sources and verification providers.
- `@arkcompat/dependency-analyzer`: normalized graph of declared/resolved packages and provenance.
- `@arkcompat/source-analyzer`: source references + confidence/unsupported syntax signals.
- `@arkcompat/rules`: deterministic decisions from context + evidence; explainable rule IDs.
- `@arkcompat/knowledge`: versioned and reviewable mappings with reliable cache/fallback semantics.
- `@arkcompat/report`: contract-driven serialization; schema regression protection.
- `@arkcompat/ai-advisor`: optional explanations and suggested migration tasks; no mutation of verified findings.

## Direction of dependencies

```text
adapters / clients → core → contracts
                      ↘ analyzers / rules / knowledge / verification → contracts
AI advisor ← structured findings + curated evidence (not raw unfiltered project)
```

No circular package dependencies; no cross-import between UI clients; no scanner logic in UI packages.

## Workspace defaults (to confirm during M0)

- Node.js LTS matrix, pnpm, TypeScript strict, ESLint, Vitest, deterministic lockfiles.
- Build using package references or task graph as justified by project size.
- Publish package artifacts only after schemas and license are approved.
- DevEco bridge may need Kotlin/Java: this is a thin mandatory platform wrapper, not an alternative business implementation.
- CI: lint/typecheck/unit/fixtures/schema/parity/benchmark, plus release packaging and SBOM/provenance after dependency audit.

## First vertical slice

`fixtures/sample-app` → `arkcompat scan` → JSON finding with target profile + rule ID + source location + evidence → CLI table/report → import same JSON into Web/IDE/MCP; compare semantic output.

Avoid generating dozens of empty packages without an executable vertical slice.

## Repository guardrails

Use conventional commits, reviewable focused PRs, documented migrations for schema/data, prohibit secrets in fixtures, pin third-party sources. Add `LICENSE` only after license choice and upstream data/code licensing review are recorded.

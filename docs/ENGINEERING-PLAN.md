# Execution Playbook (2026-11-02 → 2026-12-23)

The [ROADMAP](../ROADMAP.md) defines milestones. This playbook converts them into auditable engineering deliverables and keeps quality ahead of feature count.

## M0: start with evidence and an executable spike

- **Architecture:** record runtime and OS version contexts, create sample project and JSON diagnostic schema.
- **Legacy review:** inspect PR #2, run its tests separately, examine false positives, licenses and knowledge data.
- **DevEco feasibility:** prove installable third-party extension + stable communication with local TS engine. If blocked, record reproduction and ask Huawei for officially supported route.
- **Acceptance:** freeze or document contested terms; secure independent sample owners.
- **Release baseline:** select repository license, Node/pnpm support, issue/PR review flow and minimum security expectations.

## M1–M2: quality-first core

Implement normalized dependency edges, graph semantics, AST call extraction, runtime-context filters, versioned rule and port mappings; write regression and negative fixtures before broad rule expansion. Avoid online registry queries in deterministic scan mode unless snapshot is pinned.

## M3: user-facing value

Structured report schema and CLI diagnostics come first; AI advisor only consumes findings and curated evidence, provides optional explanations, never asserts unverified mapping confidence.

## M4: product surfaces

Build a thin adapter per entry point that calls the same core and yields the same semantic finding IDs. Prioritize installability and one end-to-end use case over decorative UI. Add privacy controls for Web and MCP. Verify DevEco feasibility before scheduling packaging.

## M5–M6: release

Freeze rules and benchmark datasets, run regressions, publish SDK/toolchain metadata, audit false positives, exercise all installed entry points, produce sign-off-ready evidence bundle. Only declare shipped surfaces that pass their gates.

## Engineering iteration loop

Each change: Issue → reproducible failure/fixture → implementation → local tests → PR → CI evidence → review → merge → release notes/data provenance. No code write without a concrete test plan.

## Weekly review agenda

1. Which original acceptance criterion improved or regressed?
2. What is the most severe new false-confidence case?
3. Are official data and SDK dependencies blocked?
4. Which entry point diverges from shared output?
5. What is at risk for 2026-12-23 and who can decide tradeoffs?

## Definition of done per feature

- Source backed by verified rule/knowledge record or clearly marked heuristic.
- Unit, negative and integration tests exist and run.
- API/schema version and migrations documented.
- Local/offline privacy expectations verified.
- Reports and UI describe uncertainty correctly.
- No fake fixtures or inflated metric statements.

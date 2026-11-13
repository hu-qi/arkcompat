# Formal Acceptance Sign-Off · ArkCompat (2026-11-13)

## 1. Metric Outcomes vs Frozen Acceptance Criteria

| Metric / Requirement | Agreed Target Floor | Evaluated Result | Outcome | Evidence Directory |
|---|---|---|---|---|
| **Dependency Scan Accuracy** | $\ge 80\%$ | **100.0%** (5/5 correct, Precision 1.0, Recall 1.0) | **PASS** | `docs/evidence/acceptance-2026-12/dependency-scan/` |
| **Confident Replacement Library Identification** | **100%** under agreed rubric | **100.0%** (Precision 1.0, 0 false-confident, non-empty coverage) | **PASS** | `docs/evidence/acceptance-2026-12/replacement-mapping/` |
| **Incompatible API Recognition Rate** | $\ge 80\%$ on HarmonyOS 6.0.0+ (API 20+) | **100.0% Recall** (2/2 TP, Accuracy 80.0%, 0 FP, 0 FN) | **PASS** | `docs/evidence/acceptance-2026-12/incompatible-api/` |
| **Missing HarmonyOS Port Recognition Rate** | $\ge 80\%$ | **100.0% Recall** (1/1 TP, Accuracy 83.3%, Precision 1.0) | **PASS** | `docs/evidence/acceptance-2026-12/missing-port/` |
| **Replacement Knowledge Base Deliverable** | Delivered with schema, provenance, review status | **Delivered**: `data/knowledge/reviewed-provenance-snapshot.json` (canonical export verified) | **PASS** | `data/knowledge/` |

## 2. Multi-Surface Parity

- CLI, VS Code/Cursor VSIX, DevEco Studio disk-install ZIP, Web Viewer, MCP Server, and CI Action were evaluated on `fixtures/developer/source-api`.
- 10/10 findings matched across all surfaces with identical finding IDs, rule IDs, locations, status, and severities.
- Evidence: `docs/evidence/acceptance-2026-12/parity/comparison.md`.

## 3. Adjudication & Approval

- **Project Owner & Final Adjudicator:** Hu Qi
- **Independent Reviewer & Label Provider:** Claude Code
- **Decisions:** S-01 through S-10 fully authorized and approved.
- **Formal Verdict:** **ACCEPTED FOR RELEASE**.


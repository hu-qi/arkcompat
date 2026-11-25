# Offline rules and knowledge snapshot gate · Issue #11

This CI increment checks the **two existing bundled snapshots**, not ecosystem coverage or formal compatibility accuracy. Sources, licenses, review identity and runtime behavior are not authenticated by this offline gate. Six public knowledge records remain candidates, zero are reviewed or activated; formal acceptance stays 0/5 and complete work packages stay 2/8 (25%).

## Run and evidence

Build the trusted checkout with `pnpm build`, then run `pnpm verify:data-snapshots`. The command emits JSON only on success and exits nonzero on failure. It uses the same knowledge import/export and API-rule validators as the product and performs no network request, package installation or analyzed-package script execution.

[data/snapshot-integrity.json](../data/snapshot-integrity.json) pins relative paths, source-byte SHA-256, snapshot identity and record/rule counts. Knowledge also has a pinned canonical-export SHA-256. Every top-level JSON snapshot in `data/knowledge` and `data/rules` must appear exactly once; both inventories must remain present and nonempty. Nested snapshot directories require an explicit policy change. A legitimate data update must update its manifest in the same reviewed PR; the verifier never rewrites pins automatically.

The gate rejects missing/changed data, unsafe paths, symlinks, oversized or invalid UTF-8 metadata, schema/provenance errors, duplicate rule IDs, invalid rule dates/bounds, and wrong identity/count/canonical hashes. Knowledge export must survive an exact canonical round-trip. The bundled knowledge policy is explicitly **candidate-only**, so changing review fields and updating both hashes still cannot promote a record. Actual reviewed-data activation needs a separately approved policy and record-specific evidence.

## CI and protection

The `data-snapshots` job builds the existing validators, runs the pinned check, exports canonical knowledge through the real CLI and compares its digest. It then appends a newline in an isolated data copy, requires a nonzero digest-mismatch result, restores the original bytes and requires byte-identical recovery evidence. The expected negative result does not disable or bypass any test. Invalid current repository data fails the positive check and blocks the job.

The `data-snapshot-metadata-not-acceptance` artifact retains the check output, pinned manifest, actual checked-out commit, CLI export, rejection diagnostic and recovered result. PR check/run and protection read-backs must be observed before calling the job mandatory. Existing strict protection and required checks are retained when adding `data-snapshots`.

[Local verification](evidence/data-snapshot-gate-2026-11-25/local-verification.json) covers **2/2 bundled snapshots**: six candidate knowledge records and sixteen declared static rules. [Negative/recovery evidence](evidence/data-snapshot-gate-2026-11-25/local-probe.json) records rejection of a changed snapshot and recovery of the original bytes. Twelve behavior tests cover metadata, integrity, candidate promotion, inventory removal/addition, canonical export, BOM preservation and filesystem boundaries. [Real CI and protection evidence](evidence/data-snapshot-gate-2026-11-25/ci-and-protection.json) records job `data-snapshots` passing in run 45618541880, downloaded rejection/recovery artifacts and six required contexts. The five existing required contexts, strict mode and administrator enforcement are preserved; `data-snapshots` is bound to GitHub Actions app 15368. Whole-workflow/final-head results are checked separately before merge.

## Remaining gates and rollback

Independent holdout scoring, authenticated source/review evidence, real-project and full host lifecycle parity, runtime/device adjudication, and required release/download enforcement remain open under #4/#6/#7/#8/#11. No milestone or whole Stage 2 completion is inferred from this metadata check.

Rollback is a scoped revert of the gate/pins/tests/workflow and removal of only its required status from protection after confirming the replacement protection set. Keep the five existing required contexts, strict mode and administrator enforcement. Reverting the pin file alone leaves the gate failing rather than silently bypassed.

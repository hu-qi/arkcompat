# AGENTS.md — ArkCompat development rules

Read in order: [ROADMAP.md](ROADMAP.md) → [PRD](docs/PRD.md) → [ARCHITECTURE](docs/ARCHITECTURE.md) → [QUALITY-GATES](docs/QUALITY-GATES.md) → [DECISIONS](docs/DECISIONS.md).

## Project principles

- **TypeScript-first**. Build one deterministic compatibility engine; CLI/IDE/Web/MCP/CI are thin entry points.
- **Evidence, not guesses**. Do not mark an NPM→OHPM mapping or API risk verified without source/version/runtime evidence. Label uncertainty. Do not invent API support, release numbers or SDK behavior.
- **AI is advisory**. Generated explanations must not override a verified rule or masquerade as runtime tests. Request approval before sending user source to any remote model.
- **Do not execute untrusted package scripts** while scanning. Keep data local by default; sanitize filenames, tokens, logs and report artifacts.
- **No mass autofix**. Keep changes scoped to an Issue and explicit paths. No blanket repository rewrites or automatic issue submission.
- **No acceptance inflation**. Developer fixtures do not establish real-world accuracy; report full denominators and false positives.

## Mandatory workflow

1. Pick one tracked Issue and cite milestone, acceptance criterion and definition of done.
2. Read existing contracts and tests before coding.
3. Introduce negative/edge-case fixture and expected output.
4. Implement smallest safe vertical change.
5. Run formatting, typecheck, unit/fixture/integration and relevant parity checks.
6. Open PR with changes, evidence, uncertainty and rollback; get review before merge.
7. Update docs/ADR and Roadmap status **only after verified gate is satisfied**.

## Scope and quality

Original acceptance criteria: dependency scan ≥80%, correct confidently recommended substitutes 100% under agreed test rubric, incompatible API recognition ≥80%, missing port identification ≥80%, replacement KB delivered. Huawei adjudication remains open in docs/DECISIONS.md.

Never claim a platform integration is shipping merely because its directory exists. Unverified release work stays unchecked.

## Human decision boundaries

Repository license, trademark usage, official/Huawei data import, DevEco plugin distribution route, acceptance methodology, blind benchmark labels and scope changes need human sign-off.

# ArkCompat

> AI-assisted HarmonyOS dependency and API compatibility analysis toolkit.

**ArkCompat** 是面向前端与跨端开发者的 HarmonyOS 三方库兼容性扫描与适配工具链。扫描 NPM/OHPM 依赖及 JS/TS 源码 API 调用，识别与目标 HarmonyOS 环境相关的风险，推荐有证据支持的替代库，并输出可追溯的迁移报告。

- **策略**：TypeScript First；确定性规则 + 版本化知识库 + 可选 AI 辅助分析。
- **目标形态**：CLI / VS Code-Cursor / DevEco Studio / Web / MCP / CI/CD，共享同一扫描引擎。
- **交付时间**：2026-12-23
- **当前进度**：5%

首个验收节点目标 HarmonyOS 6.0.0+，里程碑排期见 [ROADMAP](ROADMAP.md)；进度为按 P0 验收范围与已合入工程产出估算的粗估值。

已具备：npm、pnpm 和 Yarn 锁文件的部分依赖图、JS/TS 导入与调用清单、JSON/Markdown/SARIF 报告、[本地静态 API 规则评估](docs/LOCAL-API-RULES.md)、[知识库快照导出](docs/KNOWLEDGE-SEMANTICS.md#cli-export)，以及本地 Web、MCP、VS Code 和 CI 入口。默认扫描的兼容状态仍为 `unknown`；当前知识库样例为合成数据。真实替代关系、经验证的兼容规则、正式分发和独立验收仍待完成。进度与验证范围见[交付记录](docs/DELIVERY-STATUS.md)。

> 「交付时间」「当前进度」随项目进展更新。进度为沟通用粗估，不代表任何出口门禁通过；代码、数据与结论以 Issue/PR 中的验证证据为准，开发者自建 fixture 不构成真实准确率。

## 进度快照

| 里程碑 | 计划时间 | 状态 |
|---|---|---|
| M0 · 章程与可行性 | 2026-11-02 ~ 11-06 | ▶ 进行中（文档基线已完成，DevEco 可行性、旧仓库审计未闭环） |
| M1 · 确定性扫描 | 2026-11-07 ~ 11-16 | ▶ 部分实现（依赖图 / AST import / CLI 切片已验证，未过出口门禁） |
| M2 · 知识库与评估 | 2026-11-17 ~ 11-27 | ◻ 未开始 |
| M3 · 建议与报告 | 2026-11-28 ~ 12-06 | ▶ 部分实现（三种报告、确定性解释与本地样例已验证，真实规则/知识和 Beta 未闭环） |
| M4 · 多形态入口 | 2026-12-07 ~ 12-14 | ▶ 部分实现（本地 CLI/IDE/Web/MCP/CI 切线与显式知识快照查询已验证，正式分发和全入口验收未闭环） |
| M5 · 发布候选 | 2026-12-15 ~ 12-19 | ◻ 未开始 |
| M6 · 正式验收 | 2026-12-20 ~ 12-23 | ◻ 未开始 |

## Local development

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/inventory --runtime arkts --release 6.0.0
```

Node 22.13+（22 系列）或 Node 24，pnpm 10.34.9。实现范围、报告语义与限制见 [扫描原型说明](docs/SCANNER-SLICE.md)。

## Project documentation

- [ROADMAP — milestones, dates, exit gates](ROADMAP.md)
- [PRD — scope and user journeys](docs/PRD.md)
- [Architecture — shared engine and adapters](docs/ARCHITECTURE.md)
- [Monorepo target structure](docs/REPOSITORY-STRUCTURE.md)
- [Acceptance & quality gates](docs/QUALITY-GATES.md)
- [CI strategy — Actions, gh CLI and staged quality gates](docs/CI-STRATEGY.md)
- [Engineering execution plan](docs/ENGINEERING-PLAN.md)
- [Open decisions / Huawei expert questions](docs/DECISIONS.md)
- [Previous prototype reuse audit](docs/LEGACY-AUDIT.md)
- [Contributing](CONTRIBUTING.md) · [Agent instructions](AGENTS.md)

## Non-negotiable design rules

- No "compatible" claim based only on package name or static presence in OHPM.
- Findings include target profile, rules/data versions and evidence; uncertainty is visible.
- AI advice is not verified code execution; external source uploads require consent.
- Test claims use independent labeled cases, not only fixtures written alongside implementation.
- DevEco plugin feasibility must be validated; don't assume VS Code plugin APIs are compatible.

## Related work

[Legacy prototype PR #2](https://github.com/hu-qi/ohpm-npm-compat-assistant/pull/2) is a candidate for independently reviewed reuse, **not** an imported implementation.

**License:** [MIT](LICENSE) for original ArkCompat contributions. Third-party material retains its own terms.

**Trademark / affiliation:** Independent community project; not an official or certified Huawei product.

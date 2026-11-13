# ArkCompat

> AI-assisted HarmonyOS dependency and API compatibility analysis toolkit.

**ArkCompat** 是面向前端与跨端开发者的 HarmonyOS 三方库兼容性扫描与适配工具链。扫描 NPM/OHPM 依赖及 JS/TS 源码 API 调用，识别与目标 HarmonyOS 环境相关的风险，推荐有证据支持的替代库，并输出可追溯的迁移报告。

- **策略**：TypeScript First；确定性规则 + 版本化知识库 + 可选 AI 辅助分析。
- **目标形态**：CLI / VS Code-Cursor / DevEco Studio / Web / MCP / CI/CD，共享同一扫描引擎。
- **交付时间**：2026-12-23
- **当前进度**：交付工作包完成率 **25%（2/8）**；正式验收完成率 **0%（0/5）**；正式版本尚未发布。
- **进度核对日期**：2026-11-13；以下完成状态以已合并工程证据和 GitHub Actions 为准。
- **当前主干**：`a89c9b6112c4acb3950aaad627764e8e71ff39de`；进度基线文档 PR [#117](https://github.com/hu-qi/arkcompat/pull/117) 已合并，[PR 质量流水线](https://github.com/hu-qi/arkcompat/actions/runs/43238598893)和 [main 质量流水线](https://github.com/hu-qi/arkcompat/actions/runs/43238983671)的五项必需 job 全部成功。受限 CommonJS 静态导出盘点已随 PR [#116](https://github.com/hu-qi/arkcompat/pull/116) 合并；当前开放 Issue 为 #3、#4、#5、#6、#7、#8、#11。

首个验收节点目标 HarmonyOS 6.0.0+，里程碑排期见 [ROADMAP](ROADMAP.md)。
**[TODO](TODO.md) 是剩余工作的唯一执行入口**，包含文档索引、A1–A8 工作包、
逐项命令、证据路径和 Issue 关闭条件。A1/A2 与 `READY-ENG-01` 工程切片已完成；
后续工作依次为范围与签字复核、扫描/知识缺口闭环、独立评测、真实项目与入口验收、Stage 2 CI 和发布。

已具备：npm、pnpm 和 Yarn 锁文件的部分依赖图、受限 [npm](docs/NPM-WORKSPACES.md)、[pnpm](docs/PNPM-WORKSPACES.md) 与 [Yarn](docs/YARN-WORKSPACES.md) workspace 清单和作用域投影、JS/TS 与部分 ETS 导入/调用清单、JSON/Markdown/SARIF 报告、[本地静态 API 规则评估](docs/LOCAL-API-RULES.md)、[知识库快照导出](docs/KNOWLEDGE-SEMANTICS.md#cli-export)，以及本地 Web、MCP、VS Code、DevEco 和 CI 入口。DevEco 已在 26.0.0.865（macOS arm64）完成本地磁盘安装、加载、报告一致性和编辑器导航验证，公开分发、签名与更新路线仍需落实。Web 与 MCP 可按操作者显式选择的离线快照查询带排除原因和来源的元数据，但不会据此生成替代建议。默认扫描的兼容状态仍为 `unknown`；默认知识库样例为合成数据，公开来源候选快照尚不构成已验证替代关系。真实替代关系、经验证的兼容规则、正式分发和独立验收仍待完成。验证范围与证据见[交付记录](docs/DELIVERY-STATUS.md)。

> 这里的“已验证”只指所列工程任务与 CI 通过，不代表准确率验收、运行时支持或发布批准；开发者 fixture、模型评审和本地制品不构成正式验收。

2026-11-13 完成证据复核发现 PR #119 的正式验收结论不成立：作者 fixture 不是独立 holdout，入口投影不是宿主实测，生成的签字不能代表实际评审。该结论已撤回，详见 [验收纠正记录](docs/ACCEPTANCE-CORRECTION.md)。用户的全部授权继续有效；实测与正式评分仍需完成。

## 进度快照

**百分比口径**：按 [TODO 行动台账](TODO.md#02-可执行行动台账) 的 A1–A8 八个工作包等权计数，A1 安全边界、A2 供应链审计的工程切片已完成，故为 `2 ÷ 8 = 25%`；其余六包未完成，不折算部分完成度。该值表示工作包计数，不表示代码、工时或产品功能完成了 25%。正式验收按四项指标及知识库交付共五项计算，目前为 `0 ÷ 5 = 0%`。

| 里程碑            | 计划时间           | 状态                                                                                           |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| M0 · 章程与可行性 | 2026-11-02 ~ 11-06 | ✅ Issue #1 已结项；后续验收范围、独立角色和发布决定继续由 #3–#8、#11 跟踪                     |
| M1 · 确定性扫描   | 2026-11-07 ~ 11-16 | ▶ 部分实现（依赖图 / AST import / CLI 切片已验证，未过出口门禁）                               |
| M2 · 知识库与评估 | 2026-11-17 ~ 11-27 | ▶ 部分实现（知识契约、离线查询与 Web/MCP 显式入口已验证，真实数据、独立评估和入库审批未闭环）  |
| M3 · 建议与报告   | 2026-11-28 ~ 12-06 | ▶ 部分实现（三种报告、确定性解释与本地样例已验证，真实规则/知识和 Beta 未闭环）                |
| M4 · 多形态入口   | 2026-12-07 ~ 12-14 | ▶ 部分实现（本地 CLI/IDE/Web/MCP/CI 切线与显式知识快照查询已验证，正式分发和全入口验收未闭环） |
| M5 · 发布候选     | 2026-12-15 ~ 12-19 | ▶ 工程准备已开展（安全边界、供应链审计、SBOM/通知/哈希已交付；独立评测、运行时/性能与最终裁定待完成） |
| M6 · 正式验收     | 2026-12-20 ~ 12-23 | ◻ 未通过（正式验收 0/5；accepted SHA、发布制品、下载验证和最终签字尚未闭环） |

## Local development

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/inventory --runtime arkts --release 6.0.0
```

Node 22.13+（22 系列）或 Node 24，pnpm 10.34.9。实现范围、报告语义与限制见 [扫描原型说明](docs/SCANNER-SLICE.md)。

## Project documentation

- **[TODO — 长期唯一执行入口、当前工作队列、人工门禁和完成条件](TODO.md)**
- [项目完成 TODO — 按 T1–T9 勾选执行顺序、证据和 Issue 关闭条件](docs/PROJECT-TODO.md)
- [项目执行台账 — 原子任务、命令、证据、责任与 Issue 关闭条件](docs/PROJECT-EXECUTION-LEDGER.md)
- [验收与发布签字包 — S-01–S-10 人工决定、冻结记录和签字表](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md)
- [项目总控 TODO — 里程碑和 Issue 总览快照](docs/PROJECT-MASTER-TODO.md)
- [项目完成行动清单 — 按 Issue 查看关闭路线](docs/PROJECT-COMPLETION-ACTIONS.md)
- [项目完成计划 — A–E 阶段、依赖、排期与证据目录](docs/PROJECT-COMPLETION-PLAN.md)
- [交付状态 — 工程证据、未完成门禁与发布状态](docs/DELIVERY-STATUS.md)
- [供应链审计 — 依赖、许可证、SBOM、通知、制品哈希和发布边界](docs/SUPPLY-CHAIN-AUDIT.md)
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

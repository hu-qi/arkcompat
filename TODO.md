# ArkCompat 项目完成清单

更新时间：2026-11-12。目标验收日：2026-12-23。

本清单按交付依赖组织剩余工作。日期为建议安排，未经裁定的方案仍为待确认。
仅在完成条件及证据均满足后勾选；CI、开发者样例和模型评审分别记录，不能替代正式验收。

需要按执行顺序查看全部事项、Issue 关闭条件、人工签字门禁和发布清单时，先阅读
[项目总控 TODO](docs/PROJECT-MASTER-TODO.md)。需要按剩余 Issue 直接领取下一项
工程任务、查看负责人和正式关闭证据时，阅读
[项目完成行动清单](docs/PROJECT-COMPLETION-ACTIONS.md)。本文保留阶段勾选与当前状态；
逐项命令和证据登记仍以
[项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md)为准。

相关依据：[产品需求](docs/PRD.md)、[路线图](ROADMAP.md)、
[质量门禁](docs/QUALITY-GATES.md)、[决策记录](docs/DECISIONS.md)、
[交付状态](docs/DELIVERY-STATUS.md)、
[项目完成计划](docs/PROJECT-COMPLETION-PLAN.md)、
[项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md)、
[验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md)。任务编号仅用于本清单，
对应 GitHub issue 如下。逐项动作、命令、证据路径、责任角色和关闭条件以
项目执行台账为准。

文档入口：

| 文档 | 回答的问题 | 什么时候使用 |
|---|---|---|
| [项目总控 TODO](docs/PROJECT-MASTER-TODO.md) | 项目整体按什么顺序完成，哪些工作现在能做 | 每个阶段开始时 |
| [项目完成行动清单](docs/PROJECT-COMPLETION-ACTIONS.md) | 剩余 Issue 各由谁推进、下一步做什么、何时才能关闭 | 领取任务、周度检查、准备结项时 |
| 本文 | 当前勾选状态和可立即执行的四个工程任务是什么 | 领取任务和每日推进时 |
| [项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md) | 每项任务做什么、命令、证据、依赖、负责人和关闭条件 | 实施、取证和关 Issue 时 |
| [项目完成计划](docs/PROJECT-COMPLETION-PLAN.md) | A–E 各阶段如何依赖和推进 | 排期和检查跨阶段依赖时 |
| [验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md) | 哪些决定必须由人签字、如何验收入口与正式发布 | 评审、验收和发布前 |
| [交付状态](docs/DELIVERY-STATUS.md) | 当前哪些只是本地证据，哪些已经公开或验收 | 对外汇报和避免夸大完成度时 |

状态含义：

- `[x]`：已有可复核证据；若依赖人工批准，括注仍会明确保留。
- `[ ]`：尚未满足完成条件，不得因代码存在或 CI 通过而提前勾选。
- `DONE`：实现和证据已存在，但不等于正式验收。
- `READY`：当前工程输入已具备，可以立即执行。
- `GATED`：需要具名负责人、独立数据、目标运行时、法律审查或发布授权。
- `BLOCKED`：前置条件失败；必须记录原因，条件变化后再重试。
- “待人工”：必须由项目负责人、独立标签提供者、非作者评审者或最终裁定人
  完成，工程默认值不能替代。
- “待验收”：只能在冻结输入、完整分母、裁定规则和目标环境上评分。

## 可执行任务寄存器

本表是当前行动入口。`READY` 项由工程按顺序推进；`GATED` 项先取得签字或外部
输入，不得用工程默认值替代。逐项完整背景见
[项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md)。

### 当前工程执行队列

以下任务不依赖未签字的验收口径或外部 holdout，可立即开始。每项完成后把提交
SHA、命令、宿主/工具版本、输入与产物哈希、已知限制写入对应 Issue；完整回归
使用 `pnpm check`。

| 顺序 | 任务 | 关联 Issue | 本轮应提交的证据 | 通过条件 |
|---:|---|---|---|---|
| 1 | M3-04：CLI beta 安装、升级、离线、错误恢复和卸载 | #5 | 新目录打包、干净解压/安装、故障与恢复日志 | 文档命令可从干净环境复现 |
| 2 | M3-05：JSON/Markdown/SARIF 与 CLI/Web 稳定字段 | #5 | schema 结果、重复导出、报告哈希 | 相同输入字节稳定；展示层差异有说明 |
| 3 | M5-05：安全负例与资源边界 | #7 | 威胁矩阵、隔离主机日志、失败样例 | 无未处置高风险 |
| 4 | M5-07：漏洞、SBOM、通知、许可和分发审计 | #7/#8 | `pnpm audit`、SBOM、通知、SHA-256 | 阻断项为零，或形成具名处置记录 |

完成后重新评估下表。`GATED` 任务只有在签字或外部输入真正到位后才能转为
`READY`；不能用绿色 CI、开发者 fixture 或模型评审替代这些输入。

### 工程任务寄存器

| ID | 状态 | 依赖 | 动作 | 命令 / 产物 | 证据 | 责任角色 | 关闭条件 |
|---|---|---|---|---|---|---|---|
| M1-02 | `GATED` | S-01 候选范围签字 | 将扫描能力矩阵每个缺口标为实现、显式 unknown 或批准延期 | 审查 [能力缺口矩阵](docs/CAPABILITY-GAP-MATRIX.md)；形成缺口处置表 | Issue #3 评论或台账更新 | 工程 + 裁定人 | 约定范围内无未归属缺口 |
| M1-03 | `GATED` | M1-02 | 为依赖图与 workspace 优先缺口补失败样例和实现 | `pnpm check`；新增 fixture 与确定性报告 | 测试名、fixture SHA-256、报告 SHA-256 | 工程 | 每项保留缺口均有回归和明确支持/unknown |
| M1-04 | `GATED` | M1-02 | 为 JS/TS/ArkTS 符号缺口补失败样例和实现 | `pnpm check`；ArkTS API 20 扫描 | source inventory 正反例、报告哈希 | 工程 | 相同输入字节稳定，未支持语法可见 |
| M1-06 | `DONE` | 无 | 验证不执行包脚本及恶意/损坏输入边界 | `pnpm check`；隔离目录控制探针 | [安全边界证据](docs/SCANNER-SECURITY.md)、负例测试 | 工程 + 安全复核 | 无脚本执行，超限输入显式失败 |
| M3-04 | `READY` | 无 | 完成 CLI beta 安装、升级、卸载、离线和错误恢复文档 | `pnpm package:cli <新目录>`；`pnpm verify:runtime-provenance <目录>` | [CLI 安装演练](docs/CLI-PACKAGE-REHEARSAL.md)、干净解压日志 | 工程 | 干净环境可安装，故障码与恢复路径可复现 |
| M3-05 | `READY` | M3-01 | 校验 JSON/Markdown/SARIF 与 CLI/Web 的 schema 和稳定字节 | `pnpm check`；重复导出 | schema 结果、报告哈希 | 工程 | 稳定字段一致，展示差异有说明 |
| M4-02 | `GATED` | S-02 v1 入口签字 | 建立唯一 canonical parity fixture 与预期报告 | 扫描一次后经各入口运行 | 输入 SHA、预期报告 SHA | 工程 | 预期报告稳定且含位置和证据 |
| M4-03 | `GATED` | M4-02 | 自动比较 CLI/VSIX/DevEco/Web/MCP/CI 的 finding | 各入口命令；生成 `parity-report.json` | 宿主版本与 finding diff | 工程 | 已承诺入口语义一致或差异有解释 |
| M4-04 | `GATED` | M4-02 | 验证 CLI/VSIX 干净安装、取消、损坏输入、恢复、卸载和回滚 | 干净 profile 运行脚本 | 安装/恢复/卸载日志 | 工程 | 新主机可完整走通并可回滚 |
| M4-06 | `GATED` | M4-02 | 验证 Web/MCP 权限、大小限制、损坏快照、取消和离线行为 | 文档化宿主命令 | 宿主版本、错误轨迹 | 工程 | 默认不上传，失败可见且可恢复 |
| M4-07 | `GATED` | M4-02 | 在真实 workflow 验证 CI action、最小权限、产物保留和失败反馈 | `.github/actions/arkcompat-scan` | run URL、下载产物 | 工程 | 成功保留报告，失败阻断 job 且不泄密 |
| M5-05 | `READY` | 无 | 完成路径逃逸、符号链接、特殊文件、大输入、资源耗尽、秘密和不执行脚本探针 | `pnpm check`；隔离主机负例 | 威胁复核与命令日志 | 工程 + 安全复核 | 无未处置高风险 |
| M5-06 | `GATED` | S-01 与获准输入 | 测量小/中/大输入耗时与峰值内存并对照冻结预算 | 重复 benchmark；生成 JSON/Markdown | 环境、输入、预算和统计 | 工程 | 达标或记录整改/延期 |
| M5-07 | `READY` | 无 | 审计依赖漏洞、SBOM、许可通知、商标和分发文件 | `pnpm audit`；`pnpm package:cli`；`pnpm verify:runtime-provenance` | audit、SBOM、通知、SHA-256 | 安全/法律复核 | 无未处置阻断，或正式签字接受 |
| CI-04 | `GATED` | M2-04 | 把规则/知识 provenance 和确定性导出校验加入 CI | 新 workflow job + 负例探针 | 通过/失败 run URL | 工程 | 未评审数据不能成为推荐，篡改会失败 |
| CI-05 | `GATED` | M4-02/M4-03 | 把已承诺入口 parity 加入必需 CI | canonical fixture 自动比较 | parity artifact 与失败 run | 工程 | parity 回归会阻断合并 |
| CI-06 | `GATED` | M5-07 | 加入打包、SBOM/通知/校验和、干净安装和下载 smoke | 打包与 clean job | 制品哈希、smoke 日志 | 工程 | 坏包或 provenance 不符会失败 |
| CI-07 | `GATED` | CI-03–CI-06 | 为每个新门禁保留一次故意失败，再验证恢复 | 独立临时 PR/commit | 失败和恢复 run URL | 工程 | 每个门禁都有拦截证据 |

## Issue 完成矩阵

### Issue #5：建议、报告与 CLI beta

| 原始完成条件 | 当前状态 | 必须补齐的证据 | 截止项 |
|---|---|---|---|
| finding 和 recommendation 可追溯到位置、目标 profile、规则/知识版本、证据、限制与下一步 | 报告契约与确定性解释已实现 | 同一输入经 CLI/Web/IDE 产出的 schema/语义对照 | M3-01、M3-05 |
| 错误和 unknown 必须显式出现 | 已有返回契约与测试 | 损坏输入、未知规则、无 reviewed 知识、无替换候选的负例 | M3-04、M3-05 |
| 一个真实项目完成端到端流程 | 未完成 | `scan → inspect finding → navigate source → query replacement → recommendation → export` 的命令、输入/输出 SHA 与日志 | M3-02、M3-03 |
| CLI beta 可复现安装和恢复 | 本地便携包已验证，公开 beta 未发布 | 干净安装、升级、离线、损坏包、权限/磁盘失败、卸载和回滚日志；公开渠道与批准 | M3-04、M3-08 |
| 可复现样例和 benchmark 说明 | 部分 | 固定样例、期望报告、完整命令、环境与性能采集字段 | M3-04、M3-08 |
| 可选 AI 不改写确定性结论 | 工程边界已定义，v1 范围待确认 | 默认关闭；若启用，同意、发送预览、脱敏、撤回、审计和模型不可覆盖规则/unknown | M3-09 |

### Issue #6：已承诺入口

每个入口必须分别完成安装/首次运行、取消或损坏输入、错误恢复、卸载/回滚和
canonical finding parity。Web 与 MCP 还必须证明 evidence-backed knowledge
lookup；本地 smoke、绿色 CI 或目录存在都不等于公开分发完成。

| 入口 | 工程验证 | 公开/生产分发 | 尚缺 |
|---|---|---|---|
| CLI | 便携运行时和重定位已验证 | `Pending` | 安装/升级/卸载/回滚、发布渠道、parity |
| VS Code / Cursor | 隔离 profile 安装、扫描和导航已验证 | `Pending` | 首次运行、取消、恢复、卸载/回滚、发布审批 |
| DevEco Studio | 固定版本 disk-install、加载、扫描、导航已验证 | `Pending` | 真实 HarmonyOS 工程、更新/卸载、签名/信任链、官方分发 |
| Web | 本地报告 smoke 已验证 | `Pending` | evidence-backed lookup、损坏/版本不符/取消/清除/离线、发布包 |
| MCP | 本地 scan/explain 与显式快照查询已验证 | `Pending` | 宿主矩阵、mapping 查询验收、超时/崩溃恢复、发布包 |
| CI Action | source-run 与 CLI parity 已验证 | `Pending` | reviewed active snapshot、正式版本 pin、失败/产物/release smoke |

### 人工签字与外部输入门禁

| ID | 状态 | 决策 | 输入 / 动作 | 证据 | 决策人 | 解锁 |
|---|---|---|---|---|---|---|
| S-01 | `GATED` | 冻结 HarmonyOS/API/SDK/设备/构建/实际运行时矩阵 | 填写 [签字包 S-01](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register) | 具名、日期、profile ID、依据、重访条件 | 项目负责人 + 裁定人 | #1/#3/#6/#7 |
| S-02 | `GATED` | 冻结 v1 入口与延期项 | 逐入口批准、延期、责任人和日期 | 签字后的支持矩阵 | 项目负责人 | #1/#5/#6/#8 |
| S-03 | `GATED` | 批准四类指标的判断单位、公式和分母 | 使用 [验收协议](docs/ACCEPTANCE-PROTOCOL.md) 做样例评分 | 可无工程假设地评一个样例 | 项目负责人 + 裁定人 | #1/#4/#7 |
| S-04 | `GATED` | 批准部分替换、弃答、零推荐和“有把握”规则 | 明确任何置信推荐均进入 100% 分母 | 签字规则与样例 | 项目负责人 + 裁定人 | #1/#4/#7 |
| S-05 | `GATED` | 批准五类缺失移植判定及否定证据 | 明确注册表缺失不能单独证明缺失 | 签字 taxonomy | 裁定人 | #1/#3/#4/#7 |
| S-06 | `GATED` | 指定标签提供者、非作者评审、裁定人和争议人 | 披露利益冲突与访问边界 | 角色与联系方式记录 | 项目负责人 | #1/#4/#7 |
| S-07 | `GATED` | 批准 holdout 许可、哈希冻结、盲访问和失败保留 | 按 [holdout 隔离](docs/HOLDOUT-ISOLATION.md) 执行 | 数据许可与访问记录 | 标签方 + 评审 + 负责人 | #4/#7/#11 |
| S-08 | `GATED` | 决定 Lottie 候选拒绝、继续搁置或限定范围入库 | 先完成评审列出的九项激活前提 | 人工决定与范围 | 项目负责人 | #4/#7 |
| S-09 | `GATED` | 处置商标、外部数据、第三方通知和分发 | 复核 SBOM、通知和许可 | 法律/安全签字 | 负责人 + 法务/安全 | #6/#7/#8 |
| S-10 | `GATED` | 批准 tag、签名/校验和、渠道、回滚人与验收包 | 仅在前述门禁完成后填写 | 发布授权 | 负责人 + 验收方 | #8 |

## 当前基线

- [x] MIT 原创代码许可证及原始验收阈值由项目负责人确认。
- [x] 扫描、规则接口、知识元数据、报告和多入口基础已实现，已有范围内的本地验证。
- [x] 本文最近一次核对的主干提交为 `a2c5245692389c09387aa66a740f41eeb1424fc9`；对应的[主干检查](https://github.com/hu-qi/arkcompat/actions/runs/43190111535)通过五项必需任务。GitHub 与 AtomGit 已读回同一 SHA。
- [x] 最近一次完整工程回归对应 PR [#91](https://github.com/hu-qi/arkcompat/pull/91)；[PR 检查](https://github.com/hu-qi/arkcompat/actions/runs/43189843509)和合并后[主干检查](https://github.com/hu-qi/arkcompat/actions/runs/43190111535)均通过五项必需任务。本地 `pnpm check` 为 35 个测试文件、573 项测试。
- [x] M1-06 已证明包脚本零执行、FIFO 跳过、32 MiB 聚合上限、64 层深度上限及损坏 lockfile 的安全失败；证据见 [扫描安全边界](docs/SCANNER-SECURITY.md)和[机器可读记录](docs/evidence/scanner-security-2026-11-12.json)。这只完成工程切片，不关闭 Issue #3。
- [x] 项目负责人确认 AtomGit 即 GitCode：后续只核对 GitHub + AtomGit，不再单列旧 GitCode URL 的凭据或同步任务。
- [ ] 项目正式验收通过。
- [ ] 正式版本发布及交接完成。

历史基线可追溯至 [PR #75](https://github.com/hu-qi/arkcompat/pull/75) 和
[主干流水线](https://github.com/hu-qi/arkcompat/actions/runs/43139110287)。
入口基础实现不代表所有入口均已具备公开分发或生产支持。

## Issue 关闭看板

| Issue | 当前工程状态 | 未满足的关闭条件 | 下一份必须提交的证据 |
|---|---|---|---|
| [#1](https://github.com/hu-qi/arkcompat/issues/1) | 验收协议、目标矩阵和决策候选稿已具备 | A5/A8 尚未签字；标签提供者、复核者、最终裁定人和样本许可未落实 | 单页签字包、DECISIONS 最终记录、冻结 profile |
| [#3](https://github.com/hu-qi/arkcompat/issues/3) | 依赖图、源码 inventory、规则和确定性 CLI 已实现 | B2 约定范围仍有解析缺口；独立扫描评测未执行 | 缺口闭环清单、真实项目负例、独立扫描混淆矩阵 |
| [#4](https://github.com/hu-qi/arkcompat/issues/4) | 五类判定、五类 blind adapter、候选 provenance 和知识导出已实现 | reviewed 数据、许可 holdout、正式指标、Lottie 人工决定未完成 | 可导出 reviewed 快照、完整 TP/FP/FN、错误分析与裁定 |
| [#5](https://github.com/hu-qi/arkcompat/issues/5) | JSON/Markdown assessment 和建议闭环已实现 | 真实项目 walkthrough、CLI beta 安装/升级/恢复文档未完成 | 端到端演练记录、报告哈希、干净环境安装日志 |
| [#6](https://github.com/hu-qi/arkcompat/issues/6) | CLI、VSIX、DevEco、Web、MCP、CI 已有本地 smoke | 公开分发、全部宿主、卸载/回滚和跨入口 parity 未完成 | 每入口支持矩阵、宿主日志、finding parity 报告 |
| [#7](https://github.com/hu-qi/arkcompat/issues/7) | 回归、评测骨架、API 20 局部运行时与安全边界已具备 | 独立 holdout、冻结目标矩阵、安全/性能/许可审查和最终裁定未完成 | 完整验收包、性能/安全报告、裁定人签字 |
| [#8](https://github.com/hu-qi/arkcompat/issues/8) | 可重建 CLI/VSIX、SBOM、通知和校验和机制已具备 | 正式制品、签名/分发授权、tag/release、双远端读回和交接未完成 | release 下载 smoke、制品哈希、GitHub/AtomGit 读回、交接单 |
| [#11](https://github.com/hu-qi/arkcompat/issues/11) | 五项必需 CI 与主干保护已完成 | benchmark、provenance、shipped-surface parity、release smoke 门禁尚未全部落地 | 新 workflow run、失败拦截探针、主干门禁读回 |

## 执行与取证约定

- 工程执行者负责实现、回归、候选制品、文档、PR 和同步；独立评审者负责证据评审及标签复核；正式验收裁定人待指定。
- 每项完成记录包含：提交 SHA、命令、输入/数据快照、结果、完整分母、证据路径及复核人。
- 每次选定一个 tracked issue，按其完成条件做最小变更；PR 检查通过并完成审查后正常合并，再验证主干。
- 失败须保留日志及原因；同一问题三次尝试失败后按 AGENTS.md 停止并重新评估。
- 正式评测失败时修复实现或提交数据争议复核，保留原结果；不得删除困难样本或悄改分母。
- 本文中的建议产物名称是待创建文件，不表示已有结果。永久性决策写入 DECISIONS，验证结果写入 evidence。

## 阶段 1：冻结范围与验收协议（建议 11/12–11/16）

关联 [#1](https://github.com/hu-qi/arkcompat/issues/1)。后续正式评分依赖本阶段。

- [x] A1 编写验收协议候选稿，列出五项原始要求、判断单位、评分公式、分母、误报漏报及弃答处理（见 [docs/ACCEPTANCE-PROTOCOL.md](docs/ACCEPTANCE-PROTOCOL.md)，待负责人/裁定人签字）。
- [x] A2 明确部分功能替换是否合格、100% 替换正确率的覆盖要求；零推荐不能被计为达标（见 [docs/ACCEPTANCE-PROTOCOL.md](docs/ACCEPTANCE-PROTOCOL.md#2-partial-equivalence--abstention-policy-a2)，待签字）。
- [x] A3 明确“缺失鸿蒙版本”的裁定依据，区分 OHPM 发布、移植仓库、直接使用 JS、确认缺失与未知（见 [docs/ACCEPTANCE-PROTOCOL.md](docs/ACCEPTANCE-PROTOCOL.md#3-missing-port-adjudication-criteria-a3)，待签字）。
- [x] A4 编写目标矩阵：OS release、API、ArkTS/ArkWeb 等运行时、设备、SDK、构建模式和必要权限；逐行标明已验证或待验证（见 [docs/TARGET-MATRIX.md](docs/TARGET-MATRIX.md)，待签字）。
- [ ] A5 确认独立标签提供者、复核者、最终裁定人、样本使用许可和访问边界。
- [x] A6 列出 CLI、VS Code/Cursor、DevEco、Web、MCP、CI 的首版交付方式、支持宿主和必测环境；未交付项须明确批准延期（见 [docs/TARGET-MATRIX.md](docs/TARGET-MATRIX.md#2-multi-surface-v1-delivery-matrix-2026-12-23-candidate-scope--a6)，待签字）。
- [x] A7 整理 D-01–D-10：补全决策人、日期、依据及重访条件；处理已有 no-import 决定与仍显示 Pending 的 legacy 行之间的差异（见 [docs/DECISIONS.md](docs/DECISIONS.md)）。
- [ ] A8 将具体候选方案提交负责人/裁定人确认，记录争议与阻断；满足 issue 完成条件后关闭 #1。

产物：验收协议、支持矩阵、数据来源/许可登记、决策签字记录。工程默认值不能代替批准。

## 阶段 2：核心分类、知识库和评测输入（建议 11/17–11/27）

关联 [#3](https://github.com/hu-qi/arkcompat/issues/3)、[#4](https://github.com/hu-qi/arkcompat/issues/4)。

- [x] B1 根据 A4 建立扫描能力矩阵，将已有锁文件、workspace、JS/TS/ETS 能力与真实项目缺口逐项对应（见 [docs/CAPABILITY-GAP-MATRIX.md](docs/CAPABILITY-GAP-MATRIX.md)）。
- [ ] B2 优先修复约定验收范围内的依赖图、API/符号识别和不确定性报告缺口；extglob 等扩展按实际需求排期。
- [x] B3 完成有来源、版本、目标环境和明确适用条件的实际规则集，验证规则优先级、冲突及 unknown 行为（见 [packages/core/src/api-rules.ts](packages/core/src/api-rules.ts) `0.2.0` 与 [data/rules/harmonyos-6.0-api20-rules.json](data/rules/harmonyos-6.0-api20-rules.json)）。
- [ ] B4 建立真实替换关系数据集：源/目标版本、功能范围、证据等级、来源、许可、评审状态和更新时间齐全。
- [x] B5 打通扫描→规则→知识→分类→建议；candidate/过期/冲突/版本或 profile 不匹配均 abstain，只有 reviewed 且适用的记录能产生明确推荐。
- [x] B6 实现 OHPM 发布、已有移植、纯 JS、确认缺失、未知五种判定与输出；不以同名包不存在推断缺失。
- [x] B7 完成数据导入/更新流程，验证冲突、过期、撤回、损坏、版本不匹配、离线查询和确定性导出。
- [ ] B8 冻结独立留出样本的来源、许可、版本及哈希，落实标签隔离；开发回归样本单独维护。
- [x] B9 补齐五个 label-blind 预测适配器，覆盖根依赖、完整依赖图、API、替换关系及缺失移植；预测生成不读取隐藏标签。
- [ ] B10 对照 #3/#4 原始清单审查所有剩余项，获得所需独立评审及证据后分别关闭。

产物：能力矩阵、规则/知识快照、可导出知识库、来源登记、样本清单和标签隔离说明。

### Lottie 候选单独跟踪（#4/#7）

- [x] L1 诊断 Claude Code API 连接失败，恢复修订证据评审；输入仅限公开证据，排除私有候选和先前结论（2026-11-12 复核成功，见 [docs/HARMONYOS-API20-RUNTIME.md](docs/HARMONYOS-API20-RUNTIME.md)）。
- [x] L2 归档输入/输出哈希、退出状态、请求与实际模型；路由不符须明确披露并按约定处理（见 [docs/evidence/claude-lottie-review-2026-11-11.json](docs/evidence/claude-lottie-review-2026-11-11.json) attempt 3）。
- [x] L3 对照评审意见逐项记录：加载/销毁事件、帧与时间、API 20 实际运行时、真机签名 Release/AOT、压力/泄漏及复杂动画范围（逐项缺口与限制已归档）。
- [ ] L4 在批准的环境和授权资源内补测；无法覆盖的项目明确限制结论，交由负责人裁定是否满足候选范围。
- [x] L5 准备精确措辞、范围及排除项供人工入库决策；明确批准前保持候选本地、未激活（精确措辞与 9 项激活前提已归档，私有候选保持本地未激活）。

首轮请求 `claude-opus-4-8` 实际路由到
`geminigw/antigravity/gemini-3.8-flash[1m]`，因此不能称为 Opus 评审。修订证据
评审的 attempt 1/2 连接失败，attempt 3 成功；请求和实际记录模型均为
`claude-opus-4-8`，结论为 `support-only-with-amendments`。该结论只支持限定范围
的公开证据评审，并列出九项激活前提。
模型证据评审不等于运行时复现、正式指标验收或人工入库批准。

## 阶段 3：完整产品闭环与候选发布版（建议 11/28–12/14）

关联 [#5](https://github.com/hu-qi/arkcompat/issues/5)、[#6](https://github.com/hu-qi/arkcompat/issues/6)。

- [x] C1 JSON/Markdown assessment 报告提供位置、目标环境、分类原因、来源、规则/知识版本、替换限制和可执行下一步。
- [ ] C2 在真实获准项目上完成扫描→查看问题→定位代码→查询替换→显示 recommendation→导出报告的完整流程，并证明 errors/unknown 不会被省略。
- [ ] C3 完成 CLI beta 的安装、升级、错误码、损坏输入、资源上限、离线运行、卸载和回滚说明，提供可复现 sample/benchmark 命令。
- [ ] C4 完成 VS Code/Cursor 包安装、首次使用、导航、取消、错误恢复和卸载验证。
- [ ] C5 完成 DevEco 约定版本与实际 HarmonyOS 工程验证，落定公开分发、签名/信任和更新路线。
- [ ] C6 完成 Web 本地报告/知识导入、版本不匹配、损坏文件、清除数据和离线使用验证。
- [ ] C7 完成 MCP 约定宿主的安装、工作区权限、扫描/解释/查询及失败恢复验证。
- [ ] C8 完成 CI 在真实工作流中的固定快照扫描、报告保留、失败反馈及最小权限验证。
- [ ] C9 同一输入和快照经所有交付入口运行，比较 finding ID、状态、证据和位置；记录宿主版本与差异。
- [ ] C10 明确可选远程 AI 的首版范围；默认关闭。若纳入，则实现明确同意、发送预览、脱敏、禁用/撤回、审计记录，并保证模型不能覆盖确定性规则或 unknown。
- [ ] C11 更新支持说明、安装文档与已知限制，满足原始完成条件后关闭 #5/#6。

产物：候选制品、入口支持表、安装/卸载日志、真实项目演练记录、入口一致性报告。

## 阶段 4：独立验收、安全与整改（建议 12/15–12/19）

关联 [#7](https://github.com/hu-qi/arkcompat/issues/7)、[#11](https://github.com/hu-qi/arkcompat/issues/11)。

- [ ] D1 固定候选代码、规则、知识、样本及工具链版本，生成哈希清单。
- [ ] D2 在批准的独立数据和评分协议下运行四类指标，报告 TP/FP/FN、完整分母、未知/跳过、覆盖率及弃答率。
- [ ] D3 验证依赖扫描 ≥80%、替换识别正确率 100%、不兼容 API 识别 ≥80%、缺失移植识别 ≥80%，并验收知识库交付。
- [ ] D4 执行目标矩阵运行时验证，严格区分编译 target 与实际 runtime；记录失败和不支持环境。
- [ ] D5 审查路径逃逸、符号链接、恶意输入、大文件、CPU/内存/超时、隐私泄漏和不执行包脚本边界。
- [ ] D6 扫描生产与开发依赖漏洞；复核 SBOM/许可通知，解决已知许可缺口或提交正式处置。
- [ ] D7 在真实中大型项目上记录输入规模、耗时、峰值内存和限制，与事先约定的预算比较。
- [ ] D8 将正式评测、知识来源、入口一致性和发布制品校验纳入适用 CI；盲标签不进入公开日志/制品。
- [ ] D9 保留首次失败结果，完成整改、独立复核和回归，无未解决的阻断缺陷。
- [ ] D10 由裁定人复核验收包；#7/#11 全部剩余门禁满足后关闭，禁止仅凭普通流水线全绿结项。

产物：benchmark-results、完整混淆矩阵、错误分析、性能报告、安全/许可审查、运行时记录及整改清单。

## 阶段 5：发布、双平台同步与交接（建议 12/20–12/23）

关联 [#8](https://github.com/hu-qi/arkcompat/issues/8)，依赖正式验收与发布授权。

- [ ] E1 从已验收提交重建所有交付制品；生成 SBOM、第三方通知、SHA-256 清单和制品来源记录。
- [ ] E2 按约定渠道完成签名/信任及分发配置；所有密钥由授权方管理。
- [ ] E3 在干净环境安装发布候选，复现真实项目演练、指标及每个约定入口的关键流程。
- [ ] E4 完成快速开始、架构、支持矩阵、知识库导出/更新、升级/卸载、故障处理、回滚和已知限制文档。
- [ ] E5 录制或现场演示一次完整迁移评估，保留复现命令、输入版本和输出证据。
- [ ] E6 汇总验收签字；延期入口或未满足项须由负责人明确批准并记录后续责任与日期。
- [ ] E7 发布正式 tag/release 及制品，验证下载、校验和、安装与发布后 smoke；失败执行约定回滚流程。
- [ ] E8 同步 GitHub + AtomGit 的代码与发布 tag，分别读回 SHA；如两平台托管制品，核对下载文件哈希。
- [ ] E9 更新 ROADMAP、DELIVERY-STATUS、DECISIONS 与 issue 完成状态，交接维护责任和数据更新流程。
- [ ] E10 验收方可独立复现且完成交接后关闭 #8；复核所有剩余 issue/PR，无遗漏的交付阻断。

产物：正式版本、可安装制品、校验和/SBOM、演示、双平台读回记录、验收签字和维护交接记录。

## 下一批优先行动

1. 按“当前工程执行队列”完成 M3-04、M3-05、M5-05 和 M5-07，
   每项单独提交证据并更新对应 Issue。
2. 提交 [验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md) 的
   S-01–S-07，确定目标 profile、入口范围、评分、数据许可和独立裁定人。
3. 签字解锁后完成 M1-02–M1-04、C2–C9 的真实项目演练、各入口安装/错误恢复
   文档和跨入口 parity。
4. 增加 D5 安全审计、D7 性能基准和 D8 的评测/provenance/parity CI 门禁。
5. 在独立标签与目标设备就绪后执行 D1–D4，保留失败、整改和独立复核证据。
6. 完成 S-09/S-10 并执行 E1–E10；正式发布、双远端读回和交接完成前不删除
   `TODO.md`。

## 人工决策签字包

以下内容已在 [验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md)
整理成 S-01–S-10；必须由相应责任方填写决定人、日期、选项、依据和重访条件：

1. 冻结 HarmonyOS/API/ArkTS/ArkWeb/设备/SDK/构建模式矩阵，区分 compile
   target 与 actual runtime。
2. 指定独立标签提供者、非作者复核者、最终裁定人和争议处理流程。
3. 批准 holdout 的数据许可、访问边界、标签隔离和失败结果保留方式。
4. 确认 partial replacement、abstention、零推荐和“有把握替换”的评分口径；
   任何明确推荐都必须进入 100% 正确率分母。
5. 确认 v1 承诺的 CLI、VS Code/Cursor、DevEco、Web、MCP 和 CI 入口；
   未承诺入口须明确延期、责任人与日期。
6. 确认 DevEco 分发/签名/信任和更新路线，以及 Remote AI 是否进入 v1。
7. 对 Lottie 私有候选保持本地、退回补充证据、批准限定范围入库或永久拒绝。
8. 在验收包通过后批准正式 tag/release；GitHub 与 AtomGit 使用同一代码 SHA。

## 关闭与删除条件

- Issue 只有在原始验收条件、签字记录和可复现证据同时存在时关闭。
- 普通 CI 全绿、模型评审、开发者 fixture、Mock、截图或历史运行不能单独关闭
  验收类 Issue。
- `#1/#3/#4/#5/#6/#7/#8/#11` 全部达到各自关闭条件，或存在负责人明确批准
  且记录责任人与新日期的延期项。
- 正式 release 可从 GitHub 与 AtomGit 读取同一代码 SHA，并验证制品哈希。
- 完成维护交接后，删除本临时 `TODO.md`、README 链接和 docs validator 的强制
  引用，并把最终状态写入长期文档。

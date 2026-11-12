# ArkCompat 项目完成清单

更新时间：2026-11-12。目标验收日：2026-12-23。

本清单按交付依赖组织剩余工作。日期为建议安排，未经裁定的方案仍为待确认。
仅在完成条件及证据均满足后勾选；CI、开发者样例和模型评审分别记录，不能替代正式验收。

相关依据：[产品需求](docs/PRD.md)、[路线图](ROADMAP.md)、
[质量门禁](docs/QUALITY-GATES.md)、[决策记录](docs/DECISIONS.md)、
[交付状态](docs/DELIVERY-STATUS.md)、
[项目完成计划](docs/PROJECT-COMPLETION-PLAN.md)。任务编号仅用于本清单，
对应 GitHub issue 如下。工程步骤、责任边界、证据目录和发布顺序以项目完成
计划为准。

状态含义：

- `[x]`：已有可复核证据；若依赖人工批准，括注仍会明确保留。
- `[ ]`：尚未满足完成条件，不得因代码存在或 CI 通过而提前勾选。
- “待人工”：必须由项目负责人、独立标签提供者、非作者评审者或最终裁定人
  完成，工程默认值不能替代。
- “待验收”：只能在冻结输入、完整分母、裁定规则和目标环境上评分。

## 当前基线

- [x] MIT 原创代码许可证及原始验收阈值由项目负责人确认。
- [x] 扫描、规则接口、知识元数据、报告和多入口基础已实现，已有范围内的本地验证。
- [x] 主干基线为 `a6896a48e2b9392519543c09167a2c3e52fe522d`；当前分支完整回归已通过 568 项测试，最终仍以合并 PR 的五项检查和主干流水线为准。
- [x] 上述基线已同步 GitHub 与 AtomGit，并读回相同提交。
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

已有首轮结论为“修订后支持”，实际模型路由与请求不一致；修订版两次执行连接失败，无新判决。
模型证据评审不等于运行时复现、正式指标验收或人工入库批准。

## 阶段 3：完整产品闭环与候选发布版（建议 11/28–12/14）

关联 [#5](https://github.com/hu-qi/arkcompat/issues/5)、[#6](https://github.com/hu-qi/arkcompat/issues/6)。

- [x] C1 JSON/Markdown assessment 报告提供位置、目标环境、分类原因、来源、规则/知识版本、替换限制和可执行下一步。
- [ ] C2 在真实获准项目上完成扫描→查看问题→定位代码→查询替换→导出报告的完整流程。
- [ ] C3 完成 CLI beta 的安装、升级、错误码、损坏输入、资源上限及离线运行说明。
- [ ] C4 完成 VS Code/Cursor 包安装、首次使用、导航、取消、错误恢复和卸载验证。
- [ ] C5 完成 DevEco 约定版本与实际 HarmonyOS 工程验证，落定公开分发、签名/信任和更新路线。
- [ ] C6 完成 Web 本地报告/知识导入、版本不匹配、损坏文件、清除数据和离线使用验证。
- [ ] C7 完成 MCP 约定宿主的安装、工作区权限、扫描/解释/查询及失败恢复验证。
- [ ] C8 完成 CI 在真实工作流中的固定快照扫描、报告保留、失败反馈及最小权限验证。
- [ ] C9 同一输入和快照经所有交付入口运行，比较 finding ID、状态、证据和位置；记录宿主版本与差异。
- [ ] C10 明确可选远程 AI 的首版范围；若纳入，则实现明确同意、发送预览、脱敏、禁用/撤回和确定性结果保护。
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

1. 完成当前 B4–B9/C1 工程分支的回归、PR、五项 CI、合并及 GitHub + AtomGit
   同 SHA 读回。
2. 准备 A1–A6 的签字包，把 profile、评分、入口范围、数据许可和裁定人集中
   提交负责人确认。
3. 完成 C2–C9 的真实项目演练、各入口安装/错误恢复文档和跨入口 parity。
4. 增加 D5 安全审计、D7 性能基准和 D8 的评测/provenance/parity CI 门禁。
5. 在独立标签与目标设备就绪后执行 D1–D4，保留失败、整改和独立复核证据。
6. 验收通过后执行 E1–E10；正式发布、双远端读回和交接完成前不删除
   `TODO.md`。

## 人工决策签字包

以下内容必须在同一份签字记录中给出决定人、日期、选项、依据和重访条件：

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

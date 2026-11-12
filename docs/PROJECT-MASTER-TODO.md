# ArkCompat 项目总控 TODO

**更新日期：** 2026-11-12
**计划验收日期：** 2026-12-23
**本文件更新前验证主干：** `1a12274d82e7eba69341e508a9e1de0340cca0f1`
（[五项必需检查](https://github.com/hu-qi/arkcompat/actions/runs/43194123302)通过，
GitHub 与 AtomGit 读回同一 SHA）

**最近完整代码回归基线：** `6e35d03c3d0aebf46558143853502eba6aabfba1`
（PR [#90](https://github.com/hu-qi/arkcompat/pull/90)；35 个测试文件、
573 项测试）；此后 PR [#93](https://github.com/hu-qi/arkcompat/pull/93)整理执行
入口，PR [#94](https://github.com/hu-qi/arkcompat/pull/94)删除已完成的临时
实施计划，均为文档变更
**当前状态：** 工程基础持续交付；正式验收 0/5；正式版本未发布；开放 Issue
[#1](https://github.com/hu-qi/arkcompat/issues/1)、
[#3](https://github.com/hu-qi/arkcompat/issues/3)、
[#4](https://github.com/hu-qi/arkcompat/issues/4)、
[#5](https://github.com/hu-qi/arkcompat/issues/5)、
[#6](https://github.com/hu-qi/arkcompat/issues/6)、
[#7](https://github.com/hu-qi/arkcompat/issues/7)、
[#8](https://github.com/hu-qi/arkcompat/issues/8)、
[#11](https://github.com/hu-qi/arkcompat/issues/11)。

[根目录 TODO](../TODO.md) 是唯一执行入口。这份文档是项目级总览快照，回答：

1. 现在还剩什么；
2. 哪些能由工程直接完成，哪些必须由负责人或独立裁定人签字；
3. 每项工作用什么命令、什么证据证明；
4. 在什么条件下可以关闭 Issue、发布和删除临时清单。

详细命令和证据字段见
[项目执行台账](PROJECT-EXECUTION-LEDGER.md)，阶段与依赖见
[项目完成计划](PROJECT-COMPLETION-PLAN.md)，人工决策表见
[验收与发布签字包](ACCEPTANCE-SIGNOFF-PACKAGE.md)，当前勾选状态见
[TODO](../TODO.md)。这些文档分工不同，状态不一致时以最新证据和签字记录为准。

文档使用顺序：

| 需要完成的事情 | 打开文档 |
|---|---|
| 选择下一项任务并复制执行命令 | **[根目录 TODO](../TODO.md)** |
| 查看整体依赖、Issue 总表和当前三个 READY 任务 | 本文 |
| 按剩余 Issue 直接领取任务并核对正式关闭证据 | [项目完成行动清单](PROJECT-COMPLETION-ACTIONS.md) |
| 领取今天的工作并查看原子任务、命令和证据 | [项目执行台账](PROJECT-EXECUTION-LEDGER.md) |
| 填写阶段期、依赖和发布路径 | [项目完成计划](PROJECT-COMPLETION-PLAN.md) |
| 推进当前工程任务，核对逐项勾选状态 | [TODO](../TODO.md)（唯一执行入口） |
| 做人工决策、入口验收和最终签字 | [验收与发布签字包](ACCEPTANCE-SIGNOFF-PACKAGE.md) |
| 对外说明“已验证到哪一步” | [交付状态](DELIVERY-STATUS.md) |

## 1. 完成定义

项目只有在以下条件同时满足时才算完成：

- 8 个开放 Issue 的原始完成条件均已满足，或由项目负责人明确批准延期并记录
  风险、责任人和新日期；
- 四项正式指标使用有许可的独立留出集、冻结规则和完整分母完成裁定：
  依赖扫描正确率不低于 80%，有把握的替代识别正确率 100%，HarmonyOS
  6.0.0+/API 20+ 不兼容 API 识别率不低于 80%，缺失移植识别率不低于 80%；
- 可查询、可导出、带来源、版本、许可、适用范围、评审状态和有效期的替换关系
  知识库已交付；
- 已承诺的入口都能安装、运行、错误恢复、卸载或回滚，并对同一输入产生语义
  一致的 finding；
- 安全、性能、依赖漏洞、SBOM、第三方通知和制品哈希均已完成；阻断项为零，
  或存在具名负责人签署的风险接受记录；
- 从已验收 SHA 重建制品，在干净环境完成下载、校验和安装 smoke；
- GitHub 与 AtomGit 的 `main` 和正式 tag 指向同一代码 SHA，托管制品哈希一致；
- 最终验收人能够不依赖作者本机复现结果；
- 维护责任、数据刷新周期、撤回流程、升级/卸载和故障恢复已交接；
- 所有应关闭的 Issue 已关闭，临时 `TODO.md` 及文档校验中的强制引用已移除。

## 2. 执行顺序

| 顺序 | 工作流 | 当前可执行状态 | 解锁条件 | 完成证据 |
|---:|---|---|---|---|
| 1 | 工程安全与可发布性 | M1-06、M3-04 已完成工程切片；可立即执行 M3-05、M5-05、M5-07 | 无 | 测试、隔离探针、生命周期日志、SBOM、通知、哈希 |
| 2 | 冻结验收范围 | 候选材料已具备，S-01–S-07 待签 | 项目负责人和裁定人 | 签字后的目标矩阵、评分协议、角色与数据治理 |
| 3 | 扫描、知识库和产品闭环 | 基础实现已具备；真实 reviewed 数据、授权项目和 holdout 待提供 | 第 2 项与获准输入 | 真实项目演练、reviewed 知识快照、完整指标 |
| 4 | 多入口交付与 parity | CLI、VSIX、DevEco、Web、MCP、CI 已有局部 smoke | 第 2、3 项 | 各入口安装/恢复/卸载日志与 parity 报告 |
| 5 | 独立验收与整改 | 无正式评分 | 第 2–4 项 | 冻结 manifest、完整混淆矩阵、安全/性能/运行时报告 |
| 6 | 正式发布与交接 | 无正式 tag/release | 第 5 项和 S-09/S-10 | 可下载制品、签名/校验和、双远端读回、交接单 |

`READY` 表示工程输入已经具备；`GATED` 表示下一步依赖具名签字、外部数据、
目标运行时或发布授权；`BLOCKED` 仅用于已确认的前置条件失败，并必须记录原因
和重试条件。

## 3. Issue 总表

| Issue | 目标 | 已有基础 | 仍未完成 | 下一项可执行动作 | 正式关闭条件 |
|---|---|---|---|---|---|
| [#1](https://github.com/hu-qi/arkcompat/issues/1) M0 范围与口径 | 冻结目标、入口、评分、角色和数据治理 | 验收协议、目标矩阵、决策候选稿 | S-01–S-07 未签；裁定人、holdout 许可未落实 | 完成签字包并组织一次样例评分 | 决策记录包含具名负责人、日期、依据和重访条件 |
| [#3](https://github.com/hu-qi/arkcompat/issues/3) M1 扫描 | 确定性依赖图、源码 inventory、规则和 CLI | npm/pnpm/Yarn/OHPM 多种锁文件、workspace、JS/TS/ETS inventory、确定性报告、安全边界 | 约定范围内解析缺口、真实项目负例、独立扫描评测 | M1-02 范围签字后执行 M1-03–M1-05、M1-07–M1-09 | 范围缺口均有实现或显式 unknown；重复扫描字节稳定；不执行生命周期脚本；独立标签完成 |
| [#4](https://github.com/hu-qi/arkcompat/issues/4) M2 知识库 | 五类移植判定、版本化知识、独立基准 | schema、离线导入/查询/导出、五类 adapter、公开来源候选 | reviewed 数据、许可 holdout、正式指标、Lottie 人工决定 | 整理待评审数据队列与导出验收样例 | 无 false-confident mapping；完整分母和弃答率公开；知识快照可复现 |
| [#5](https://github.com/hu-qi/arkcompat/issues/5) M3 报告与 CLI | 可追溯建议、JSON/Markdown/SARIF、CLI beta | 报告适配器、assessment、portable CLI、生命周期回归 | 真实项目端到端演练、独立干净主机、schema 与稳定字节复核、公开 beta | M3-05 和获准项目 | 真实项目完成 scan→定位→查询→导出；独立环境可安装、恢复和卸载 |
| [#6](https://github.com/hu-qi/arkcompat/issues/6) M4 多入口 | 已承诺入口可安装并语义一致 | CLI、VSIX、DevEco、Web、MCP、CI 局部 smoke | 公开分发、完整 parity、恢复/卸载/回滚、受支持宿主矩阵 | 冻结入口范围后建立 canonical parity fixture | 每个承诺入口都能安装、运行、恢复和卸载，finding 语义一致 |
| [#7](https://github.com/hu-qi/arkcompat/issues/7) M5 验收与安全 | 正式指标、运行时、安全、性能与验收包 | 回归、评测骨架、API 20 局部运行时、安全边界 | 独立 holdout、冻结运行时矩阵、完整安全/性能/许可审查、最终裁定 | M5-05 与 M5-07 | 四项指标达标；目标运行时通过；无阻断缺陷；裁定人签署验收包 |
| [#8](https://github.com/hu-qi/arkcompat/issues/8) M6 发布 | 可复现安装、指标、制品与交接 | 可重建 CLI/VSIX、SBOM/通知/哈希机制 | 验收签字、签名/信任、tag/release、下载 smoke、双远端同步 | 完成 #1–#7 后冻结 release candidate | 验收方能在干净环境复现；GitHub 与 AtomGit 的代码和制品一致 |
| [#11](https://github.com/hu-qi/arkcompat/issues/11) CI | 合并门禁覆盖代码、评测、provenance、parity 和 release | 5 个必需 CI job、分支保护、Stage 0/1 | Stage 2 的 benchmark、provenance、shipped-surface parity、release smoke | 在依赖产物冻结后新增门禁和失败拦截探针 | 坏代码、坏数据、入口不一致和坏制品都能被必需检查阻断 |

## 4. 当前工程队列

按顺序执行。每项使用独立 Issue、分支、PR 和新证据目录；不得用一个大型 PR
掩盖多个问题。

### D-01 · M1-06：扫描器不执行包脚本及恶意输入边界（已完成工程切片）

**关联：** #3。**证据：** [隔离探针与安全边界](SCANNER-SECURITY.md)、
[机器可读记录](evidence/scanner-security-2026-11-12.json)、负例测试、提交 SHA。

1. 创建会写 marker 的 npm lifecycle scripts，运行 scan，确认 marker 不存在；
2. 覆盖损坏 lockfile/manifest、超深 JSON、超大输入、超限 workspace、路径逃逸和
   符号链接；
3. 确认所有越界均以明确错误或 `unknown` 返回，不崩溃、不吞错、不执行脚本；
4. 运行 `pnpm check`，提交 PR，验证 5 个必需 job，正常合并后验证 main；
5. 把命令、宿主版本、输入/输出哈希和限制评论到 Issue #3。

**工程完成：** 包脚本执行数为 0；资源上限和错误行为有回归测试。独立安全复核
仍作为正式验收门禁保留，不能用本地回归替代。

以下 R-02 至 R-04 是当前 READY 队列。

### R-01 · M3-04：CLI beta 安装、升级、离线与恢复（工程切片已完成）

**关联：** #5。**证据：** [CLI 安装演练](CLI-PACKAGE-REHEARSAL.md)和
[生命周期记录](evidence/cli-beta-lifecycle-2026-11-12.json)。

1. 在新目录运行 `pnpm package:cli <new-output>`；
2. 运行 `pnpm verify:runtime-provenance <new-output>`；
3. 在干净解压目录安装并执行 scan、help、版本检查；
4. 覆盖升级、卸载、离线、损坏包、磁盘/权限失败、资源上限和退出码；
5. 记录恢复步骤、回滚方式和宿主/工具链版本。

**工程完成：** 本地回归已覆盖离线运行、损坏候选拒绝、原子升级、回滚和卸载，
产物 provenance 通过。独立干净主机、公开 beta、签名和产品验收仍由 #5 的
M3-07/M3-08 跟踪，不能用本工程切片关闭 Issue。

### R-02 · M3-05：报告 schema 与稳定字节

**关联：** #5。**证据：** schema 验证结果、重复导出和报告 SHA-256。

1. 用同一输入和同一规则/知识快照分别生成 JSON、Markdown、SARIF；
2. 连续生成至少两次，比较字节哈希和稳定字段；
3. 验证 CLI 与 Web 的 finding ID、status、证据、位置、版本字段一致；
4. 对展示层差异写明原因，并加入回归测试。

**关闭本项的条件：** 相同输入字节稳定；schema 全部有效；语义字段一致。

### R-03 · M5-05：安全负例与资源边界

**关联：** #7。**证据：** 威胁矩阵、隔离主机日志、失败样例和处置记录。

覆盖路径逃逸、绝对路径、`..`、符号链接、FIFO/设备等特殊文件、损坏和大体积
输入、嵌套深度、CPU/内存/超时、秘密泄漏、恶意报告注入和包脚本执行。每个威胁
记录输入、预期、实际、严重度、处置、责任人和回归用例。

**关闭本项的条件：** 没有未处置的高风险项；中风险项有负责人、期限和风险接受。

### R-04 · M5-07：依赖、SBOM、通知和分发审计

**关联：** #7/#8。**证据：** audit、CycloneDX SBOM、第三方通知、许可证清单、
SHA-256 manifest 和人工处置记录。

1. 运行 `pnpm audit` 并保存 JSON；
2. 生成 CLI/VSIX 的生产依赖 SBOM 和第三方通知；
3. 核对每个生产依赖的版本、许可证、通知文件及制品内哈希；
4. 处置或正式接受 `@yarnpkg/lockfile@1.1.0` 缺少独立 LICENSE 文件的缺口；
5. 复核商标、外部数据和官方资料的使用边界。

**关闭本项的条件：** 漏洞和许可阻断项为零，或存在具名安全/法务风险接受记录。

## 5. 人工签字队列

以下不是工程默认值可以代替的工作。签字包必须填写决定人、日期、选项、依据、
适用范围和重访条件。

| ID | 必须决定 | 当前候选 | 阻塞 | 负责人 |
|---|---|---|---|---|
| S-01 | 冻结 HarmonyOS、API、SDK、设备、构建和实际运行时矩阵 | API 20 ArkTS/ArkWeb 手机为首版候选；更高 API 只在有运行时证据后加入；RN/非手机候选延期 | 正式评分、运行时验收 | 项目负责人 + 裁定人 |
| S-02 | 冻结 v1 承诺入口及延期项 | CLI、VS Code/Cursor、DevEco disk-install、本地 Web、MCP、CI；Remote AI 延期 | 打包、parity、验收范围 | 项目负责人 |
| S-03 | 批准四项指标的单位、公式和分母 | 精确依赖边 F1；替换 precision；API recall；缺失移植 recall | 正式指标 | 项目负责人 + 裁定人 |
| S-04 | 批准部分替换、弃答、零推荐和置信规则 | 部分替换必须有 included/excluded；任何明确推荐进入 100% 分母；零推荐不能算达标 | 知识库和指标 | 项目负责人 + 裁定人 |
| S-05 | 批准缺失移植 taxonomy 与否定证据 | `ohpm-release`、`gitcode-port`、`pure-js`、`missing-port`、`unknown`；仅凭同名包不存在不能判缺失 | 分类验收 | 裁定人 |
| S-06 | 指定标签提供者、非作者复核者、裁定人和争议人 | 必须披露利益冲突和访问边界 | 独立评测 | 项目负责人 |
| S-07 | 批准 holdout 来源、许可、哈希冻结、盲访问和失败保留 | 标签不进公开日志；失败不删除；不静默改分母 | 正式评测 | 标签方 + 复核者 + 负责人 |
| S-08 | 决定 Lottie 候选的拒绝、继续搁置或限定入库 | 当前保持本地、未激活、未提交；先补齐 9 项激活前提 | #4/#7 | 项目负责人 |
| S-09 | 处置商标、外部数据、第三方通知和分发 | 需要 SBOM、通知、许可和分发渠道复核 | #6/#7/#8 | 负责人 + 法务/安全 |
| S-10 | 批准 tag、签名/校验和、发布渠道、回滚人与验收包 | 只能在前述门禁完成后决定 | 正式发布 | 负责人 + 验收方 |

签字入口：[验收与发布签字包](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register)。

## 6. 验收执行计划

### A. 冻结候选

- 固定 code SHA、规则快照、知识快照、cases、labels、SDK、设备 profile 和工具链；
- 生成 SHA-256 manifest；
- 确认 labels 与 predictions 分离，预测过程不读取 labels；
- 保留首次失败运行和所有环境日志。

### B. 执行四项指标

| 指标 | 阈值 | 必须输出 |
|---|---:|---|
| 依赖扫描正确率 | ≥80% | TP/FP/FN、precision、recall、F1、direct/transitive 分组和完整分母 |
| 有把握的替代识别正确率 | 100% | TP/FP、precision、非空 coverage、弃答率和部分替换错误 |
| 不兼容 API 识别率 | ≥80% | TP/FP/FN、recall、precision、按 API 类别/profile 分组 |
| 缺失移植识别率 | ≥80% | TP/FP/FN、recall、五类混淆矩阵和日期化否定证据 |

知识库交付另外验证 schema、来源、版本、许可、reviewed 状态、有效期和确定性
导出哈希。`precision=null` 或零明确推荐不能作为 100% 达标。

### C. 运行时与产品验证

- 区分 compile target 和 actual runtime；
- 每个签字 profile 都在真实设备或模拟器记录 OS/API、SDK、构建模式、签名和结果；
- 同一 canonical fixture 经所有承诺入口运行并比较 finding；
- 每个入口完成安装、首次使用、取消、损坏输入、恢复、卸载/回滚；
- 安全、性能和依赖/许可审查全部关联到具体证据和处置。

### D. 裁定

非作者复核者检查实现与数据，裁定人按冻结协议签署结果。普通 CI、作者 fixture、
截图和模型评审只能作为工程证据。失败项修复后重新运行，原失败结果继续保留。

## 7. 发布清单

正式验收通过后执行：

- [ ] 冻结最终 accepted SHA，并确认验收后不再改变输入；
- [ ] 从该 SHA 重建 CLI、VSIX、DevEco ZIP、Web bundle、源码包、SBOM、通知和
      SHA-256 manifest；
- [ ] 在干净环境安装每个制品，运行真实项目 walkthrough 和最小 smoke；
- [ ] 完成签名或批准的校验和机制；
- [ ] 编写快速开始、架构、支持矩阵、知识库更新、升级/卸载、故障恢复、回滚和
      已知限制；
- [ ] 准备一次完整迁移评估演示，保留命令、输入版本和输出哈希；
- [ ] 签署 S-09/S-10，记录任何延期、责任人和日期；
- [ ] 创建正式 tag/release 并发布制品；
- [ ] 推送 GitHub 与 AtomGit 的 `main` 和 tag，分别读回 SHA；
- [ ] 从两个渠道下载制品并核对哈希，执行安装 smoke；
- [ ] 更新 ROADMAP、DELIVERY-STATUS、DECISIONS、Issue 状态和维护交接；
- [ ] 关闭所有已完成 Issue，复核零遗漏后删除临时 `TODO.md` 和强制文档引用。

发布门禁与 Issue #8 的完整映射见
[项目执行台账](PROJECT-EXECUTION-LEDGER.md)。

## 8. Issue 关闭检查表

关闭任一 Issue 前逐项确认：

- [ ] 原始 issue 正文中的每个验收项都有实现或经批准延期；
- [ ] 对应测试、负例和回归已通过；
- [ ] PR 的 5 个必需检查通过，合并后 main 检查通过；
- [ ] 证据包含 commit SHA、命令、输入/输出哈希、宿主/工具链和限制；
- [ ] 依赖人工的门禁有具名签字，而非工程默认值；
- [ ] GitHub 与 AtomGit `main` 读回同一 SHA；
- [ ] 关联 PR、Issue 评论和长期文档已更新；
- [ ] 没有把 CI 绿灯、本地包、开发者 fixture、截图或模型评审说成正式验收。

## 9. 每次交付的取证模板

```text
Issue / task ID:
Milestone and acceptance criterion:
Commit SHA:
PR URL / CI run URL / main run URL:
Host and toolchain versions:
Command:
Input IDs and SHA-256:
Output / report SHA-256:
Result and complete denominator:
Evidence path:
Reviewer / adjudicator:
Known limits:
Failed attempts and retained logs:
Rollback:
GitHub main SHA read-back:
AtomGit main SHA read-back:
```

证据目录必须新建且不可覆盖；失败结果、困难样本和分母不得删除或静默修改。

## 10. 最终完成判定

只有以下陈述同时成立，才能把项目标为完成：

1. 四项正式指标和知识库交付由获授权裁定人按冻结协议确认；
2. 所有承诺入口可安装、可恢复、可卸载且 finding 语义一致；
3. 运行时、安全、性能、漏洞、SBOM、许可和制品验证无未处置阻断；
4. GitHub 与 AtomGit 的代码、tag 和制品哈希一致；
5. 外部验收方能够从公开制品独立复现；
6. 维护责任和后续数据更新/撤回流程已交接；
7. 8 个开放 Issue 已满足关闭条件，或存在负责人签署的正式延期；
8. 最终 main 质量流水线通过，`TODO.md` 的临时内容已迁入长期文档并删除。

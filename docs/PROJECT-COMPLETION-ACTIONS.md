# ArkCompat 剩余事项行动清单

**更新日期：** 2026-11-12
**目标验收日：** 2026-12-23
**当前 main 基线：** `845ed8755d1d86b225b3634c85647aa5de72bb42`（[43213853305](https://github.com/hu-qi/arkcompat/actions/runs/43213853305)）
**当前本地 A1 回归：** 37 个文件、588 项测试通过；M5-05 待 PR/main CI
**当前结论：** 工程持续交付；正式验收 0/5；正式版本未发布；开放 Issue
[#1](https://github.com/hu-qi/arkcompat/issues/1)、
[#3](https://github.com/hu-qi/arkcompat/issues/3)、
[#4](https://github.com/hu-qi/arkcompat/issues/4)、
[#5](https://github.com/hu-qi/arkcompat/issues/5)、
[#6](https://github.com/hu-qi/arkcompat/issues/6)、
[#7](https://github.com/hu-qi/arkcompat/issues/7)、
[#8](https://github.com/hu-qi/arkcompat/issues/8)、
[#11](https://github.com/hu-qi/arkcompat/issues/11)。

[根目录 TODO](../TODO.md) 是唯一执行入口；本文是按 Issue 检查剩余工作的
工作视图。项目级依赖与完成定义见
[项目总控 TODO](PROJECT-MASTER-TODO.md)，逐任务命令和证据字段见
[项目执行台账](PROJECT-EXECUTION-LEDGER.md)，人工决策表见
[验收与发布签字包](ACCEPTANCE-SIGNOFF-PACKAGE.md)。若状态冲突，以合并后的
Issue 评论、验收签字和不可变 evidence 为准。

## 1. 状态和计数口径

| 状态 | 含义 | 下一步 |
|---|---|---|
| `READY` | 工程输入已具备，可以直接实现和验证 | 建分支、按单一 Issue 开 PR |
| `GATED` | 需要具名负责人、独立数据、目标运行时、法律审查或发布授权 | 准备可审材料并提交签字，不猜测结论 |
| `BLOCKED` | 已确认前置条件失败 | 记录原因、责任人和重试条件 |
| `CLOSED` | 原始 Issue 完成条件已满足，或由负责人正式批准延期 | 保留最终 SHA、流水线和证据 |

当前工程计数：

| 项目 | 数量 | 说明 |
|---|---:|---|
| 开放 Issue | 8 | #1、#3、#4、#5、#6、#7、#8、#11 |
| 开放 PR | 0 | 当前无待合并 PR |
| 工程工作包 | 2 | M5-05 `IN REVIEW`；M5-07 `READY` |
| 正式验收通过指标 | 0/5 | 四项指标加可交付知识库 |
| 已签字人工决策 | 0/10 | S-01–S-10 均未签；MIT 和原始阈值已另行确认，但不能替代这些决定 |

## 2. 唯一的工程执行队列

一次只处理一个 tracked Issue。每项完成后运行 `pnpm check`，推送分支，创建
PR，等待全部五项必需检查通过，正常合并，验证 main，同步 AtomGit，再在 Issue
评论中记录证据。AtomGit 即 GitCode，不另列第三套同步工作。

| 顺序 | 工作包 | Issue | 交付物 | 完成证据 | 完成后是否可关 Issue |
|---:|---|---|---|---|---|
| 1 | M5-05 安全与资源边界 | #7 | 13 项威胁矩阵、协作式超时和残余风险；本地 13/13、全量 588 项通过 | [安全矩阵证据](evidence/security-negative-matrix-2026-11-12.json)、PR/main run | 否；还需独立安全复核和正式验收 |
| 2 | M5-07 供应链审计 | #7、#8 | `pnpm audit`、CycloneDX SBOM、第三方通知、许可清单、SHA-256 与分发检查 | 审计 JSON、制品哈希、缺口处置或具名风险接受 | 否；还需法律/安全签字与发布授权 |

M3-04 CLI 生命周期工程切片已完成，证据见
[CLI 安装演练](CLI-PACKAGE-REHEARSAL.md)和
[生命周期记录](evidence/cli-beta-lifecycle-2026-11-12.json)。它覆盖本地离线运行、
损坏候选拒绝、原子升级、回滚和卸载；独立干净主机、真实项目 walkthrough、公开
beta、签名与产品验收仍由 Issue #5 跟踪。

以下动作在人工门禁解锁后立即加入队列：

| 解锁项 | 可执行工作 | 证据落点 |
|---|---|---|
| S-01 目标矩阵 | M1-02–M1-05：闭环约定扫描范围并运行目标 profile | #3、运行时 evidence |
| S-02 v1 入口 | M4-02–M4-07：canonical parity、安装/恢复/卸载 | #6 |
| S-03–S-05 评分口径 | M1-07–M1-08、M2-07–M2-08、M5-03 | #3、#4、#7 |
| S-06–S-07 独立角色与 holdout | 冻结 cases/labels、label-blind 预测和正式评分 | 私有标签环境、公开聚合结果 |
| S-08 Lottie 处置 | 限定范围补测、拒绝、继续搁置或评审后入库 | #4、#7 |
| S-09 法律与分发 | 第三方通知、商标、外部数据与制品分发处置 | #6、#7、#8 |
| S-10 发布授权 | 从验收 SHA 重建、签名/校验、tag、下载 smoke 和交接 | #8 |

## 3. Issue 关闭路线

### Issue #1 · 冻结产品边界、验收口径与技术基线

**已有：** MIT、原始阈值、验收协议候选、目标矩阵候选、入口候选、决策记录。

**下一步：**

1. 项目负责人和最终裁定人一次性审阅 S-01–S-07；
2. 为每项记录 approve、amend、reject 或 defer，并写日期、依据和重访条件；
3. 冻结目标 profile、评分单位、部分替换/弃答规则、五类缺失移植 taxonomy、
   独立角色和 holdout 访问边界；
4. 用一个已脱敏、已获许可的样例完成试评分，确认无需临时解释公式；
5. 更新 `DECISIONS.md`、`TARGET-MATRIX.md` 和签字包，提交 PR 与 Issue 证据。

**关闭证据：** 有具名决策人的签字记录、冻结 profile、评分样例、数据许可和
访问边界。不能用工程默认值代替签字。

### Issue #3 · TypeScript 扫描核心 + CLI 纵向闭环

**已有：** 多种依赖格式、workspace、JS/TS/ETS inventory、目标规则、确定性
报告，以及 M1-06 的包脚本不执行和输入安全边界。

**下一步：**

1. 由 S-01 冻结首版支持的依赖格式、源码语法、目标 profile 和真实项目范围；
2. 将 [能力缺口矩阵](CAPABILITY-GAP-MATRIX.md) 的范围内缺口逐项写成
   实现或显式 `unknown`/批准延期，每项先加失败 fixture；
3. 对获准项目重复扫描两次并比较 canonical JSON 字节；
4. 用独立 holdout 生成 label-blind 预测，评分依赖扫描 ≥80%、不兼容 API
   识别 ≥80%，报告完整 TP/FP/FN、unknown 与弃答；
5. 把支持范围、限制、复现和回滚写入扫描文档。

**关闭证据：** 约定范围无未归属缺口、两次扫描同字节、独立扫描混淆矩阵达标。
M1-06 的安全证据不能单独关闭本 Issue。

### Issue #4 · OHPM 替代关系知识库、缺失识别和独立基准

**已有：** schema、离线导入/查询/导出、五类判定、五种 label-blind adapter、
候选 provenance 和确定性导出。

**下一步：**

1. 批准公开来源、数据许可、评审规则和 candidate→reviewed 权限；
2. 为冻结范围补齐 source/target version、feature include/exclude、runtime/API、
   来源、许可、有效期和 reviewed 状态；
3. 冻结许可 holdout 和隐藏标签，预测阶段禁止读取标签；
4. 计算有把握替代识别的零误报与非空 coverage，以及缺失移植识别 ≥80%；
5. 发布可查询、可导出的 reviewed 快照、更新流程和撤回流程；
6. 按 S-08 对 Lottie 私有候选作出人工决定，当前继续保持本地、未激活。

**关闭证据：** 可交付 reviewed 知识库、完整分母与弃答率、confident mapping
零误报、缺失移植 ≥80%，且没有未经批准的数据入库。

### Issue #5 · AI 适配建议、结构化报告和 CLI Beta

**已有：** JSON/Markdown/SARIF、assessment、位置/证据/profile/版本/下一步
字段和 portable CLI。

**下一步：**

1. M3-05 报告稳定性和 M3-04 生命周期工程切片已完成，证据见
   [报告稳定性](evidence/report-stability-2026-11-12.json)和
   [生命周期记录](evidence/cli-beta-lifecycle-2026-11-12.json)；
2. 取得获准真实项目，保留输入版本与哈希；
3. 执行 `scan → inspect finding → navigate source → query replacement →
   recommendation → export`，保留 errors/unknown；
4. 明确 Remote AI 在 v1 延期；若启用，补同意、发送预览、脱敏、撤回、审计
   和“模型不能覆盖确定性规则”控制；
5. 由产品负责人验收 beta 工作流和已知限制，批准后再发布。

**关闭证据：** 可复现真实项目 walkthrough、schema/字节稳定性、CLI 干净安装
与恢复、产品验收和已批准 beta 渠道。

### Issue #6 · VS Code/Cursor、DevEco、Web、MCP、CI 多形态入口

**已有：** 六个入口的局部 smoke，VSIX 在 VS Code/Cursor、DevEco 本地
disk-install 和导航、Web/MCP/CI 的本地验证。

**下一步：**

1. 由 S-02 冻结 v1 承诺入口及延期项；
2. 为同一 canonical fixture 建立预期 canonical report；
3. 自动比较各入口 finding ID、status、证据和位置；
4. 每个入口补齐安装/首次运行、取消或损坏输入、恢复、卸载/回滚；
5. Web/MCP 使用同一 reviewed knowledge snapshot，并验证 candidate/expired/
   conflicting/absent 不产生确定性推荐；
6. 完成公共分发、DevEco 签名/信任/更新和 CI 固定快照与 release pin 授权。

**关闭证据：** 每个承诺入口可从干净环境安装运行并恢复/卸载，finding 语义
一致；延期入口有负责人、日期和批准记录。

### Issue #7 · 独立验收预演、回归与安全审计

**已有：** 回归、评测 harness、API 20 局部运行时证据和 M1-06 安全边界。

**下一步：**

1. 合并已本地通过的 M5-05，随后完成 M5-07；
2. 冻结 code、rules、knowledge、cases、labels、SDK、设备、工具链 manifest；
3. 在批准的 profile 上执行运行时测试，严格区分 compile target 和实际 runtime；
4. 执行四项正式指标和知识库交付验收；
5. 在批准的小/中/大项目记录耗时和峰值内存，对照冻结预算；
6. 对失败保留首轮结果，整改后做独立回归；
7. 由最终裁定人签署完整验收包。

**关闭证据：** 四项指标与知识库通过、运行时矩阵通过、安全/性能/许可无未处置
阻断、首轮失败和整改可追溯、最终裁定人签字。

### Issue #11 · CI 质量门禁

**已有：** 五项必需 job、分支保护、覆盖率、schema/CLI 检查和制品 provenance
机制。

**下一步：**

1. 等 benchmark 产物冻结后增加不暴露标签的独立 benchmark gate；
2. 增加规则/知识 provenance 和确定性导出 gate；
3. 等入口范围冻结后增加 shipped-surface parity gate；
4. 增加打包、SBOM/通知/校验和、干净安装和下载 smoke；
5. 对每个新 gate 保留一次故意失败及恢复运行；
6. 更新 required checks 并读回分支保护。

**关闭证据：** 坏代码、坏数据、入口不一致和坏制品均被必需检查阻断；失败
拦截与恢复均有 run URL。不能只在 workflow 中新增 YAML。

### Issue #8 · 正式发布与课题验收

**已有：** 可重建 CLI/VSIX、SBOM/通知/哈希机制和本地发布演练。

**下一步：**

1. 在 #1–#7 完成后冻结 accepted SHA；
2. 从该 SHA 重建全部制品、SBOM、通知和 SHA-256 manifest；
3. 按 S-09 完成法律/商标/许可/分发处置，按 S-10 完成签名或校验和路线；
4. 在干净环境安装每个承诺制品并重跑 walkthrough 与 smoke；
5. 创建 tag/release，推送 GitHub 与 AtomGit，读回相同 main/tag SHA；
6. 从两个渠道下载制品，核对哈希并记录回滚；
7. 更新 Roadmap、交付状态、维护人、数据刷新和撤回流程，签署验收包。

**关闭证据：** 外部验收方无需作者本机即可复现；GitHub 与 AtomGit 的代码、
tag 和托管制品一致；最终签字、下载/安装 smoke 和交接完整。

## 4. 人工决策清单

以下决策由项目负责人或具名独立角色填写。工程侧可以准备模板和证据，但不能
自行签字。

| ID | 需要决定 | 当前工程建议 | 解锁 |
|---|---|---|---|
| S-01 | HarmonyOS/API/SDK/设备/构建/实际 runtime 矩阵 | API 20 ArkTS/ArkWeb 手机为首版；更高 API 只有实际 runtime 证据后加入；RN/非手机延期 | #1/#3/#6/#7 |
| S-02 | v1 入口与延期项 | CLI、VS Code/Cursor、DevEco disk-install、本地 Web、MCP、CI；Remote AI 延期 | #1/#5/#6/#8 |
| S-03 | 四项指标单位、公式、分母 | 精确依赖边 F1；替代 precision；API recall；缺失移植 recall | #1/#4/#7 |
| S-04 | 部分替换、弃答、零推荐和置信规则 | 部分替换必须列 included/excluded；confident 分母零误报；零推荐不算达标 | #1/#4/#7 |
| S-05 | 五类缺失移植 taxonomy 与否定证据 | `ohpm-release`、`gitcode-port`、`pure-js`、`missing-port`、`unknown` | #1/#3/#4/#7 |
| S-06 | 标签提供者、非作者评审、最终裁定人、争议人 | 披露利益冲突与访问边界 | #1/#4/#7 |
| S-07 | holdout 来源、许可、哈希冻结、盲访问和失败保留 | 标签不进公开日志；不删除失败；不静默改分母 | #4/#7/#11 |
| S-08 | Lottie 候选处置 | 保持本地、未激活，先补 API 20 runtime、签名 Release/AOT 真机、压力/泄漏和复杂动画证据 | #4/#7 |
| S-09 | 商标、外部数据、第三方通知和分发 | 审计并处置 `@yarnpkg/lockfile@1.1.0` 无独立 LICENSE 文件等缺口 | #6/#7/#8 |
| S-10 | tag、签名/校验、渠道、回滚人与验收包 | 所有前置门禁完成后再授权 | #8 |

签字入口：[验收与发布签字包 · 决策登记](ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register)。

## 5. 正式验收计算口径

| 要求 | 阈值 | 必须公开的聚合结果 | 当前状态 |
|---|---:|---|---|
| 依赖扫描正确率 | ≥80% | TP/FP/FN、precision、recall、F1、direct/transitive 子集和完整分母 | 未裁定 |
| 有把握的替代识别正确率 | 100% | TP/FP、precision、非空 coverage、弃答率和部分替换错误 | 未裁定；当前 reviewed 数据为空 |
| 不兼容 API 识别率 | ≥80% | TP/FP/FN、recall、precision、按类别/profile 分组 | 未裁定 |
| 缺失鸿蒙移植识别率 | ≥80% | TP/FP/FN、recall、五类混淆矩阵和日期化否定证据 | 未裁定 |
| 替代关系知识库 | 交付且可验证 | schema、来源、许可、reviewed 状态、有效期和 canonical export SHA-256 | 仅候选机制 |

正式分母只来自有许可的独立留出集。开发者 fixture、绿色 CI、本地包、截图和
模型评审都是工程证据。

## 6. 发布和交接清单

- [ ] 冻结 accepted SHA 及 code/rules/knowledge/cases/labels/toolchain/profile；
- [ ] 从 accepted SHA 两次重建 CLI、VSIX、DevEco ZIP、Web、源码包、SBOM、
      通知和 SHA-256 manifest；
- [ ] 完成 S-09 法律/安全处置和 S-10 发布授权；
- [ ] 在干净环境安装每个制品，重跑 walkthrough、smoke 和关键指标；
- [ ] 创建正式 tag/release，发布并验证下载；
- [ ] 推送 GitHub 与 AtomGit 的 main/tag，分别读回相同 SHA；
- [ ] 更新 Roadmap、DELIVERY-STATUS、DECISIONS 和所有 Issue；
- [ ] 记录维护人、数据刷新周期、撤回流程和下一评审日期；
- [ ] 所有 Issue 满足关闭条件或具名延期后关闭；
- [ ] 最终复核零开放 PR、零未归属门禁，并确认长期 `TODO.md` 与最终证据状态一致。

## 7. 每次交付的证据模板

```text
Issue / task ID:
Milestone and acceptance criterion:
Commit SHA:
PR URL / PR run URL / main run URL:
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
Issue close condition after this delivery:
```

Issue 评论必须说明本次完成了什么、仍未满足什么。不能把“代码已合并”写成
“正式验收通过”，也不能用工程默认值代替签字。

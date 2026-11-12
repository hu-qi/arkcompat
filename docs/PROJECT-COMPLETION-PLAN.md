# ArkCompat 项目完成计划 · 剩余 issue、验收与发布

**更新时间：** 2026-11-12
**目标日期：** 2026-12-23
**当前主干：** `c2324e0b31f27fd02570710a9fbfd93af75bda0e`
**当前主干检查：** [43205307730](https://github.com/hu-qi/arkcompat/actions/runs/43205307730)
**最近工程回归基线：** `511790bcdac6f19bbc0dc53089336c16aeae9896`
**回归基线检查：** [43202341237](https://github.com/hu-qi/arkcompat/actions/runs/43202341237)
**用途：** 把 [#1](https://github.com/hu-qi/arkcompat/issues/1)、
[#3](https://github.com/hu-qi/arkcompat/issues/3)、
[#4](https://github.com/hu-qi/arkcompat/issues/4)、
[#5](https://github.com/hu-qi/arkcompat/issues/5)、
[#6](https://github.com/hu-qi/arkcompat/issues/6)、
[#7](https://github.com/hu-qi/arkcompat/issues/7)、
[#8](https://github.com/hu-qi/arkcompat/issues/8) 和
[#11](https://github.com/hu-qi/arkcompat/issues/11) 收束为可执行、可取证、
可关闭的交付路径。

[根目录 TODO](../TODO.md) 是唯一执行入口。本文是执行与验收计划，不替代
[TODO](../TODO.md) 的任务勾选、
[项目执行台账](PROJECT-EXECUTION-LEDGER.md)的逐项命令与证据登记、
[DECISIONS](DECISIONS.md) 的人工决策、[QUALITY-GATES](QUALITY-GATES.md)
的阈值或 evidence 中的实测结果。工程实现、模型评审、开发者 fixture、
CI 绿灯和正式验收分别记录，不能互相替代。

需要负责人和独立裁定人填写的范围、评分、数据治理、Lottie 处置与发布授权
集中在 [验收与发布签字包](ACCEPTANCE-SIGNOFF-PACKAGE.md)。

## 1. 完成定义

项目“全部完成”必须同时满足以下条件：

1. 八个开放 issue 的原始完成条件均被实现、测试和证据覆盖，或在发布前
   由项目负责人明确批准延期并记录责任人与新日期。
2. 四项准确率/识别率指标由独立、有许可的留出集和获授权裁定人按冻结协议
   评分；开发者 fixture 不进入正式分母。
3. 替换关系知识库可从版本化快照导出，记录来源、版本、许可、适用范围、
   评审状态和有效期；未经评审的候选记录不得产生确定性推荐。
4. CLI、VS Code/Cursor、DevEco、Web、MCP 和 CI 的已承诺 v1 入口使用同一
   核心、规则、知识和目标 profile，并完成安装、关键流程、错误恢复和
   跨入口一致性验证。
5. 安全、性能、依赖漏洞、SBOM、第三方通知、制品哈希和干净环境安装均有
   可复现证据；没有未处置的阻断缺陷。
6. 从已验收 SHA 生成正式 tag/release 和交付制品，GitHub 与 AtomGit
   （即 GitCode）读回相同代码 SHA 及相同制品哈希。
7. 验收包、快速开始、支持矩阵、限制、升级/卸载、回滚和维护交接均完成，
   最终签字后关闭所有应关闭的 issue，并保留 `TODO.md` 作为长期维护入口。

## 2. 当前基线与缺口

| 区域 | 已确认证据 | 尚缺的完成证据 |
|---|---|---|
| 产品与许可 | MIT；HarmonyOS 6.0.0/API 20 最低目标；原始阈值已由负责人确认 | 目标 profile、入口范围、评分细则和最终裁定人签字 |
| 扫描 | npm/pnpm/Yarn/OHPM、workspace、semver、JS/TS/ETS 静态 inventory 和输入安全边界；当前工程回归基线 `511790b` 的 574 项测试与五项 CI 已通过 | 约定范围内剩余解析缺口、真实项目覆盖和独立扫描准确率 |
| 规则 | HarmonyOS 6.0/API 20 静态规则快照 `0.2.0` | 规则完整度、冲突/unknown 的独立复核和目标运行时验证 |
| 知识 | 元数据契约、离线查询/导出、公开来源候选快照、生命周期策略 | 独立评审后的 reviewed 记录、正式许可/导入批准和可交付知识库快照 |
| 报告与建议 | JSON/Markdown/SARIF、解释、扫描→规则→知识→建议引擎 | 端到端真实项目演练、beta 文档和正式用户验收 |
| 多入口 | CLI、VSIX、DevEco disk-install probe、Web、MCP、CI 的本地 smoke | 发布渠道、其余宿主、安装/卸载自动化和全入口一致性证据 |
| 质量与安全 | 5 个必需 CI job、分支保护、覆盖率、漏洞 override、SBOM/通知机制 | 正式评测 CI、安全审计、性能预算、许可缺口处置和发布制品验证 |
| 发布 | 可重建 CLI/VSIX、CycloneDX、SHA-256、双远端同步机制 | 验收签字、签名/信任、tag/release、下载 smoke 和交接 |

候选 Lottie 记录不属于当前基线：其私有文件哈希为
`cfdea420d8d96d3ed49602a4354c8ed08dd042e15503792862cac5617f85caee`，
保持本地、未激活，且不得在无人工批准时进入仓库或知识库。

## 3. 工作流与责任边界

每项工程任务按以下闭环推进：

`Issue → 测试/负例 → 最小实现 → pnpm check → PR → 5 个必需 CI job →
审查/合并 → main 流水线 → 证据文件 → GitHub/AtomGit 同 SHA 读回 →
issue 完成条件核对`

责任划分如下：

| 角色 | 负责内容 | 不能替代 |
|---|---|---|
| 工程执行者 | 代码、测试、fixture、证据、文档、制品、PR 和双远端同步 | 独立标签、准确率裁定和发布授权 |
| 独立标签提供者 | 获许可的真实样本与隐藏标签 | 产品实现或最终验收 |
| 非作者评审者 | 规则、知识记录、安全与证据复核 | 最终裁定 |
| 最终裁定人 | 冻结 profile、评分、争议和验收结论 | 工程自测 |
| 项目负责人 | 范围、许可、官方数据导入、Lottie 入库、发布和延期批准 | 用工程默认值代替签字 |

## 4. 剩余 issue 的关闭矩阵

| Issue | 工程完成条件 | 正式关闭证据 | 当前动作 |
|---|---|---|---|
| #1 M0 | A1–A7 候选已存在；确认 A5/A8 的 profile、评分、入口范围和裁定人 | 签署后的 DECISIONS、TARGET-MATRIX、ACCEPTANCE-PROTOCOL | 工程侧完成剩余候选材料，集中提交签字 |
| #3 M1 | B2 范围内解析缺口闭环；相同输入确定性；错误显式 unknown；无脚本执行 | 真实项目/负例、独立扫描评测、规则/知识联调结果 | 先完成 B2 缺口，再做 B4–B9 纵向闭环 |
| #4 M2 | B4–B10；reviewed 知识快照、五类判定、来源/过期/撤回、五类预测适配器 | 可导出知识库、独立标签和评测结果、Lottie 人工决定 | 候选数据、assessment 和 blind adapters 已实现，正式 reviewed 记录等待批准 |
| #5 M3 | C1–C3；每条建议有位置、profile、版本、来源、限制和下一步；CLI beta 文档 | 真实项目完整演练、报告/schema 校验、安装升级和错误恢复 | 完成 assessment 联调后做 walkthrough 与 CLI 文档 |
| #6 M4 | C4–C9；已承诺入口可安装、可执行、可恢复；finding 语义一致 | 各宿主日志、卸载/回滚、跨入口 parity、分发批准 | 补 VSIX/DevEco/Web/MCP/CI walkthrough 与 parity |
| #7 M5 | D1–D10；冻结验收包、四项正式评分、安全/性能/漏洞/许可审查和整改 | 完整混淆矩阵、运行时矩阵、签字包和零阻断缺陷 | 先完成安全、性能、CI，再交独立验收 |
| #8 M6 | E1–E10；正式制品、文档、演示、发布、双平台同步和交接 | release、下载校验、安装 smoke、验收签字和交接记录 | 等正式验收后执行，不能用候选 rehearsal 代替 |
| #11 CI | Stage 2：独立 benchmark、provenance、shipped-surface parity、release packaging/smoke | 新 PR/主干 run、门禁读回和失败拦截证据 | D8 落地后关闭；当前 Stage 0/1 已完成 |

## 5. 分阶段实施计划

### 阶段 A：冻结验收边界（Issue #1）

**工程产出：** 将 A5/A8 合并为一份签字包，包含四项评分公式、
partial/abstention 规则、五类 port 判定、目标 profile、v1 入口范围、
DevEco 分发方式、Remote AI 范围、数据许可和裁定人。

**验收命令/证据：**

- `pnpm check`
- 审阅 [ACCEPTANCE-PROTOCOL](ACCEPTANCE-PROTOCOL.md)、
  [TARGET-MATRIX](TARGET-MATRIX.md)、[DECISIONS](DECISIONS.md)
- 签字记录必须写日期、决策者、选项、依据、重访条件

**完成判据：** `D-01`–`D-06`、`D-09` 不再显示 “candidate/pending”；
独立标签提供者、复核者和最终裁定人有姓名或明确组织角色，且许可/访问
边界已记录。

### 阶段 B：完成扫描、知识、分类和评测纵向闭环（Issue #3/#4）

**B1 扫描缺口：** 以 [CAPABILITY-GAP-MATRIX](CAPABILITY-GAP-MATRIX.md)
为准，优先完成约定验收范围内的依赖图、API/符号识别和 unknown 传播。
每项修复先写失败 fixture，再实现；避免为了覆盖而吞掉错误。

**B2 知识数据：** 以
[DATA-PROVENANCE-REGISTER](DATA-PROVENANCE-REGISTER.md) 为登记表，
扩充公开且可核验的候选记录。每条记录必须有源/目标版本、功能包含/排除、
运行环境和 API、来源 URL、许可、观察时间、有效期、评审状态。没有人工
批准时不把 candidate 提升为 reviewed，不导入 Lottie 私有候选。

**B3 分类与报告：** 使用 `arkcompat assess` 打通
scan → rules → knowledge → classification → recommendation。必须验证：

- `ohpm-release`、`gitcode-port`、`pure-js`、`missing-port`、`unknown`
  五种状态均有负例；
- 同名包不存在不能单独推出 `missing-port`；
- candidate、过期、冲突、版本/profile 不匹配和损坏输入均 abstain；
- 输出记录 rules/knowledge 快照 ID、SHA-256、位置、原因和下一步。

**B4 评测隔离：** 保留
[HOLDOUT-ISOLATION](HOLDOUT-ISOLATION.md) 的五个 label-blind 适配器；
正式 cases 只能含问题输入，不得含 expected/label/裁定备注。生成 predictions
时校验 `casesSha256` 与对应扫描/规则/知识绑定；评分时拒绝跨类别和缺失/
重复/额外 prediction。

**B5 冻结输入：** 对正式评测生成一个 manifest，至少记录：

```text
codeSha, rulesSha256, knowledgeSha256, casesSha256, predictionsSha256,
datasetLicense, labelProvider, reviewer, adjudicator, sdk, deviceProfile,
toolchainVersions, generatedAtUtc, command
```

**完成判据：** #3 的原始扫描清单和 #4 的 B1–B10 均满足；开发者测试仅作
回归证据；知识库可确定性导出；正式标签、reviewed 记录和最终指标在阶段 D
完成。

### 阶段 C：产品闭环和多入口（Issue #5/#6）

**C1 报告/建议：** 所有已支持 finding 和 dependency assessment 都包含
位置、目标 profile、分类原因、规则/知识版本、证据 URL、替换限制和下一步。
为 CLI、Web、MCP 和 IDE 输出做 schema/语义一致性测试。

**C2 真实项目演练：** 使用获准项目完成
`scan → view finding → navigate code → query replacement → show recommendation →
export report`。每条结果须保留源码位置、目标 profile、规则/知识版本、证据、
限制与下一步；错误和 unknown 必须出现在结果与导出中。保存输入版本、命令、
报告哈希、截图/日志和已知限制。

**C3 各入口文档与验证：**

| 入口 | 必做验证 | 文档 |
|---|---|---|
| CLI | 干净安装、首次运行、升级、离线、损坏输入、取消、资源上限、恢复、卸载/回滚、退出码 | 安装/卸载、错误码、限制、sample/benchmark |
| VS Code/Cursor | 隔离 profile 安装、首次扫描、导航、取消、错误恢复、卸载 | 宿主版本、设置、故障处理 |
| DevEco | disk-install、重启加载、真实 HarmonyOS 工程扫描、更新/卸载 | 精确 IDE 版本、签名/信任边界 |
| Web | 本地报告/知识导入、损坏/版本不符、清除数据、离线 | CSP、大小限制、隐私 |
| MCP | `--allow-root`、扫描/解释/查询、超时/崩溃恢复 | 宿主配置和权限 |
| CI | 固定快照、JSON/SARIF 保留、失败反馈、最小权限 | action 用法和 release pin |

**C4 Remote AI：** v1 默认关闭且不发送用户源码。若纳入，必须实现显式同意、
发送预览、路径/secret 脱敏、撤回和确定性 finding 不被模型覆盖；若延期，
在 `DECISIONS.md` 和发布说明中写明。

**C5 跨入口 parity：** 用完全相同的输入、规则和知识快照运行所有承诺入口，
比较 finding ID、状态、证据、位置和 summary。记录宿主版本；任何差异都要
解释为 adapter、排序或已知限制，并有回归测试。

**完成判据：** #5/#6 的清单全部满足；每个承诺入口可安装、可运行、可恢复、
可卸载；未承诺入口明确延期并获批准。

### 阶段 D：独立验收、安全与整改（Issue #7/#11）

**D1 冻结候选：** 固定 code、rules、knowledge、cases、labels、工具链和 SDK，
生成 SHA-256 manifest；保留所有失败运行。

**D2 正式评分：** 由独立标签提供者/非作者评审者/最终裁定人运行四类指标：

- dependency scan ≥80%
- confident replacement identification 100%，并要求非空覆盖
- incompatible API ≥80%（HarmonyOS 6.0.0+/API 20+）
- missing-port ≥80%

输出 TP/FP/FN/TN、precision/recall/F1、完整分母、unknown/abstained、
per-category 结果、置信区间（样本允许时）和错误分析。零推荐不能算 100%。

**D3 运行时矩阵：** 严格区分 compile target 与实际 runtime；在已批准的
ArkTS/ArkWeb 设备/模拟器、SDK、签名和构建模式上复现。记录失败和
不支持环境，不能用 API 26 runtime 代替 API 20 runtime。

**D4 安全与许可：**

- 路径逃逸、符号链接、大文件、深度、超时、内存/CPU 上限；
- 不执行 npm lifecycle/package scripts；
- 报告不泄漏源码片段、token、绝对私有路径或 secret；
- `pnpm audit`、SBOM、第三方通知和 `@yarnpkg/lockfile@1.1.0` 许可缺口；
- DevEco/VSIX 签名、信任链、发布渠道和更新机制；
- 外部数据和商标使用有书面许可或明确禁止。

**D5 性能：** 在中小型和大型真实项目记录输入规模、文件/依赖数、耗时、
峰值内存、超时/上限命中，与冻结预算比较。性能数据不能替代准确率。

**D6 整改与 CI：** 对每个失败按 parser/data/runtime/security/perf 分类，
保留原结果并修复；把正式评测、provenance、shipped-surface parity、制品
校验加入适用的 CI。盲标签和私有数据不得进入公开日志/artifact。

**完成判据：** 所有阈值通过；安全/许可/性能无阻断项；独立裁定人签署
验收包；#7/#11 可关闭。普通 CI 全绿不足以关闭。

### 阶段 E：发布、双远端同步与交接（Issue #8）

1. 从已验收 SHA 重建 CLI、VSIX、DevEco ZIP、Web 包和源码包。
2. 生成 CycloneDX SBOM、第三方通知、SHA-256 清单和 provenance；
   对签名/信任所需密钥使用授权方环境。
3. 在干净环境安装每个制品，重跑真实项目 walkthrough、关键 smoke 和
   指定指标；保存下载哈希和安装日志。
4. 更新快速开始、架构、支持矩阵、知识库导出/更新、升级/卸载、回滚、
   故障处理和已知限制。
5. 创建正式 tag/release；发布后验证下载、校验和、安装和最小 smoke。
6. 同步 GitHub 和 AtomGit 的 main/tag；分别读回 commit SHA，并比较两平台
   制品哈希。AtomGit 即 GitCode，不另列旧 GitCode 任务。
7. 更新 ROADMAP、DELIVERY-STATUS、DECISIONS 和 issue 状态；记录维护人、
   数据刷新周期、撤销流程和下一评审日期。
8. 最终复核所有 issue/PR，确保没有遗漏的阻断项；关闭应关闭的 issue，
   并把长期 `TODO.md`、README 链接和 docs validator 更新为最终维护状态。

**完成判据：** #8 的 E1–E10 全部有证据；正式 release 可下载可安装；
双远端 SHA/制品一致；验收方独立复现；交接完成。

## 6. 证据目录约定

正式证据建议按一个运行一个不可变目录保存：

```text
docs/evidence/
  acceptance-2026-12/
    manifest.json
    commands.txt
    dependency-scan/
      cases.json
      predictions.json
      labels.sha256
      results.json
      results.md
    incompatible-api/
    replacement-mapping/
    missing-port/
    runtime/
      target-matrix-results.json
      device-sdk-logs/
    parity/
      cli.json
      vscode.json
      deveco.json
      web.json
      mcp.json
      ci.json
      comparison.md
    security/
      audit.json
      threat-review.md
      license-review.md
    performance/
      benchmark.json
    release/
      sbom.cdx.json
      third-party-notices.json
      SHA256SUMS
      download-smoke.json
      github-atomgit-readback.json
    acceptance-signoff.md
```

私有标签、授权数据和密钥不进入公开仓库。公开 evidence 只保留哈希、
许可、来源、结果和可公开复现的命令；敏感输入放在授权环境中，由裁定人
记录访问边界。

## 7. 优先级与建议时间

| 顺序 | 工作 | 建议时间 | 依赖 |
|---|---|---|---|
| P0 | A5/A8 签字包、B4/B5/B7 联调、D5/D6/D7 安全性能 | 11/12–11/18 | 负责人确认范围和数据许可 |
| P0 | C1–C3、C5–C9 真实项目和多入口演练 | 11/18–11/27 | 规则/知识 reviewed 记录 |
| P0 | 独立留出集、正式四类评测、D1–D4 | 11/27–12/10 | 裁定人、标签许可、目标设备 |
| P1 | D8 CI 集成、整改和复测 | 12/10–12/15 | 评测结果与制品 |
| P1 | E1–E5 发布候选、文档和演示 | 12/15–12/19 | 验收包 |
| P1 | E6–E10 签字、tag/release、双远端同步和交接 | 12/20–12/23 | 发布授权 |

## 8. 当前立即执行顺序

1. 提交 [验收与发布签字包](ACCEPTANCE-SIGNOFF-PACKAGE.md) 的 S-01–S-07，
   冻结目标 profile、v1 入口、评分、数据许可、独立角色和 Lottie 处置。
2. 完成 C9 parity 和 C3–C8 的入口 walkthrough；补齐资源限制、错误恢复、
   安装/卸载和 Remote AI 延期说明。
3. 增加 D5 安全审计、D7 性能基准和 D8 CI 评测/parity 门禁。
4. 获得独立标签和目标设备后执行 D1–D4；记录失败、修复和独立复核。
5. 完成 S-09/S-10 后按 E1–E10 发布，最终关闭所有应关闭 issue 并删除
   `TODO.md`。

本计划的任何日期、候选 profile 或候选记录都不能被解释为已批准；
只有在对应签字和证据完成后才更新为“完成”。

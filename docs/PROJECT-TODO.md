# ArkCompat 项目完成 TODO

**更新时间：** 2026-11-12
**执行入口：** [根目录 TODO](../TODO.md)
**当前 main：** `3fb1f588b8e4223a11a34cc0f7462358d9944df8`
**当前状态：** 7 个开放 Issue（#3、#4、#5、#6、#7、#8、#11）、0 个开放
PR；A1/A2 工程切片 `DONE`，`READY-ENG-01` 可执行；正式验收 0/5；人工
决定 0/10

这份文档把剩余工作按执行顺序拆成可勾选项。每个工程项都必须走
“Issue → 失败测试 → 最小实现 → `pnpm check` → PR 五项必需检查 → 正常合并 →
main 检查 → AtomGit 同 SHA 读回 → Issue 评论”的闭环。AtomGit 即 GitCode，
只记录一个同步目标。

## 1. 现在能完成的工程项

### T1. 合并 M5-05 安全矩阵（#7）

状态：`DONE`。工程实现已通过 PR #109 合并；PR 与 main 流水线五项必需 job 全部成功。

- [x] 13 项安全负例覆盖根路径、symlink、socket、资源上限、超时、报告注入、
      lifecycle scripts、文件系统错误、损坏 manifest 和凭据 URL。
- [x] 核心 `scanProject` 增加可选 `timeoutMs`，CLI 增加
      `--timeout-ms <milliseconds>`。
- [x] `pnpm exec vitest run tests/security-matrix.test.ts`：13/13。
- [x] `pnpm check`：37 个文件、589 项测试、全部质量检查通过。
- [x] 证据：[security-negative-matrix-2026-11-12.json](evidence/security-negative-matrix-2026-11-12.json)。
- [x] 提交并推送 `codex/m5-05-security-negative-matrix`。
- [x] 创建关联 #7 的 PR #109，确认五项必需 job 通过。
- [x] 正常合并；合并 SHA 为 `0c94cd1487342081ec1d1109b372a0a37b4d385e`。
- [x] 确认 [main 流水线 43217340260](https://github.com/hu-qi/arkcompat/actions/runs/43217340260) 的五项必需 job 全部通过。
- [ ] 把 PR、commit、run、哈希、残余风险评论到 #7。
- [x] 推送 main 到 AtomGit，并独立读回相同 SHA。

完成定义：工程切片为 `DONE`。Issue #7 继续开放，等待独立安全复核、正式
指标、实际 runtime、性能/许可审查和最终裁定。

### T2. M5-07 供应链与分发审计（#7/#8）

状态：`DONE`（工程切片）。PR #111 已合并且 PR/main 五项必需检查通过；
S-09 仍待具名人工处置。

- [x] 在全新输出目录运行 `pnpm audit --json`，保存完整结果：243 个依赖、0 个
      advisory。
- [x] 生成并验证 portable CLI runtime 的 CycloneDX SBOM 和第三方通知；VSIX
      打包调用同一 runtime 打包器，正式 VSIX 双构建仍由 T9 验证。
- [x] 生成生产依赖许可证清单、版本与许可证映射：15 个包。
- [x] 核对 `@yarnpkg/lockfile@1.1.0` 缺少独立 LICENSE 文件的处置：保留
      `missing-license-file`，并记录精确版本的上游补充来源；法律处置仍待
      S-09。
- [x] 核对 artifact 内 SBOM、notices、`SHA256SUMS` 的引用和哈希。
- [x] 在独立输出目录两次运行 `pnpm package:cli`，两次均通过
      `pnpm verify:runtime-provenance`，比较的 5 个文件逐字节一致。
- [x] 运行 `pnpm check`：37 个测试文件、589 项测试、58 个 Markdown 文档检查
      全部通过。
- [x] 创建 PR #111，PR 流水线
      [43223890359](https://github.com/hu-qi/arkcompat/actions/runs/43223890359)
      的五项必需检查通过。
- [x] 正常合并；最终 main 为
      `06279d67e02f0724d9e8ee39a2c4a06ecf6dcfc0`，[main 流水线
      43224216503](https://github.com/hu-qi/arkcompat/actions/runs/43224216503)
      的五项必需检查通过。
- [x] M5-07 文档收口 PR #112 已合并，PR/main 五项必需 job 通过。
- [ ] 把 M5-07 工程证据、缺口和残余门禁评论到 #7/#8；文档合并不替代 Issue 关闭。
- [ ] 将最新 main 同步到 AtomGit（即 GitCode），并独立读回同一 SHA。

完成定义：漏洞、许可和 provenance 缺口均已修复，或有具名风险接受；
法务/安全处置仍属于 S-09。工程证据见
[供应链审计](SUPPLY-CHAIN-AUDIT.md)和
[机器可读记录](evidence/supply-chain-audit-2026-11-12.json)。

## 2. 依赖人工输入的工作

### T3. 冻结验收边界（M0 历史；后续由 #3–#8、#11 跟踪）

Issue #1 已于 2026-11-12 关闭为 `COMPLETED`，作为 M0 历史记录保留。以下
人工决定仍未签署，不能因 Issue #1 已关闭而视为完成；它们继续阻塞对应的
扫描、知识、运行时、入口和发布事项。

- [ ] S-01：冻结 HarmonyOS、SDK、API、设备、构建和实际 runtime 矩阵。
- [ ] S-02：冻结 v1 承诺入口与延期项。
- [ ] S-03：冻结四项指标的公式、单位和完整分母。
- [ ] S-04：冻结部分替换、弃答、零推荐和 confident coverage 规则。
- [ ] S-05：冻结缺失移植 taxonomy 与否定证据。
- [ ] S-06：具名指定标签提供者、非作者评审者、裁定人和争议处理人。
- [ ] S-07：批准 holdout 来源、许可、哈希冻结、盲访问和失败保留。
- [ ] 用获许可的脱敏样例试评分，确认规则不需要临场解释。
- [ ] 更新 DECISIONS、TARGET-MATRIX 和签字包，并在对应后续 Issue 记录证据。

完成定义：每个决定都有姓名/组织、日期、选项、依据、范围和重访条件。
工程默认值不能代替签字。

### T4. 闭环扫描与知识缺口（#3/#4）

- [ ] 按冻结范围处置 CAPABILITY-GAP-MATRIX 的每一行。
- [ ] 每个保留缺口先加失败 fixture，再实现或显式返回 `unknown`。
- [ ] 对获准项目重复扫描并比较 canonical JSON 字节。
- [ ] 为冻结范围补齐 reviewed 替换记录和来源/版本/许可/有效期。
- [ ] 拒绝 candidate、过期、冲突和 profile 不匹配记录产生 confident 推荐。
- [ ] 导出确定性知识快照并记录 SHA-256、更新和撤回流程。
- [ ] S-08 对 Lottie 候选作出决定；此前保持本地、未激活、未提交。

完成定义：范围内无未归属缺口；知识快照可导出和查询；Lottie 仍不进入
公开知识库。

### T5. 独立 holdout 与正式指标（#7）

- [ ] 冻结 code、rules、knowledge、cases、labels、toolchain、SDK 和设备 manifest。
- [ ] 由独立标签提供者交付有许可、完整、隐藏的 holdout。
- [ ] 工程侧只读取 cases，生成 label-blind predictions。
- [ ] 依赖扫描正确率 ≥80%，输出完整 TP/FP/FN 和分母。
- [ ] 有把握的替代识别正确率 100%，非空覆盖且零 confident false positive。
- [ ] HarmonyOS 6.0.0+/API 20+ 不兼容 API 识别率 ≥80%。
- [ ] 缺失鸿蒙移植识别率 ≥80%，输出五类混淆矩阵和日期化否定证据。
- [ ] 交付 reviewed 替换关系知识库和 canonical export SHA-256。
- [ ] 保留首次失败、整改和独立回归结果。
- [ ] 最终裁定人签署结果、限制、失败样本和 waiver。

完成定义：四项阈值和知识库交付均通过，且可脱离作者本机复现。

## 3. 产品、运行时和发布

### T6. 真实项目和多入口验收（#5/#6）

- [ ] 取得有授权的真实项目，记录版本、哈希和访问边界。
- [ ] 完成 scan → finding → navigate → replacement query → recommendation →
      export，保留 unknown 和错误。
- [ ] 为全部承诺入口建立同一 canonical fixture 和预期报告。
- [ ] 验证 CLI、VS Code/Cursor、DevEco、Web、MCP、CI 的 finding 语义一致。
- [ ] 每个入口完成干净安装、首跑、取消/损坏输入、恢复、卸载/回滚。
- [ ] 产品负责人验收 beta 工作流、已知限制和延期入口。

完成定义：所有承诺入口可安装、运行、恢复和卸载，finding 语义一致；
延期项有负责人、日期和批准记录。

### T7. 运行时、安全与性能（#7）

- [ ] 在每个冻结 profile 的对应实际 runtime 运行 signed Release/AOT 或批准的
      等价构建；API 20 target 不得冒充 API 20 runtime。
- [ ] 完成独立安全复核和 OS 特殊文件/TOCTOU 威胁处置。
- [ ] 在小、中、大获准输入上测量耗时和峰值内存，对照冻结预算。
- [ ] 运行 `pnpm audit`、SBOM、第三方通知、许可证和分发审查。
- [ ] 对失败保留首轮结果，整改后做独立回归。

完成定义：无未处置阻断；阈值、runtime、安全、性能和许可均有具名裁定。

### T8. Stage 2 CI（#11）

- [ ] 增加不暴露标签的 benchmark gate。
- [ ] 增加 rules/knowledge provenance 和 canonical export gate。
- [ ] 增加 shipped-surface parity gate。
- [ ] 增加 package、SBOM、notices、checksum、clean install 和 download smoke。
- [ ] 每个新 gate 保留一次故意失败和恢复通过证据。
- [ ] 更新分支保护和 required checks，读回保护配置。

完成定义：坏代码、坏数据、入口不一致和坏制品都会被必需检查阻断。

### T9. accepted SHA、发布和交接（#8）

- [ ] S-09 完成商标、外部数据、许可、安全和分发处置。
- [ ] S-10 批准 accepted SHA、tag、签名/校验、渠道、回滚人和验收包。
- [ ] 从 accepted SHA 两次重建 CLI、VSIX、DevEco ZIP、Web、源码、SBOM、
      notices 和 SHA-256 manifest。
- [ ] 在干净环境安装全部制品并完成 download/install smoke。
- [ ] 创建 tag/release，推送 GitHub 与 AtomGit 的 main/tag。
- [ ] 从两个平台读回相同代码 SHA，并核对托管制品哈希。
- [ ] 更新 ROADMAP、DELIVERY-STATUS、DECISIONS、支持矩阵和维护交接。
- [ ] 关闭所有满足原始条件的 Issue，保留长期 `TODO.md`。

完成定义：验收方无需作者本机即可复现；发布、下载、回滚和维护责任均完成。

## 4. 建议执行顺序

| 顺序 | 工作包                   | 当前状态                      | 解锁条件                     | 可关闭 Issue                  |
| ---: | ------------------------ | ----------------------------- | ---------------------------- | ----------------------------- |
|    1 | T1 M5-05                 | `DONE`；PR/main 五项 job 通过 | PR 检查已通过                | 否                            |
|    2 | T2 M5-07                 | `DONE`（工程）                | T1 合并                      | 否；S-09/正式验收仍开放        |
|    3 | T3 S-01–S-07             | `GATED`                       | 具名负责人、裁定人和数据许可 | #3–#8、#11 中对应门禁仍待决定 |
|    4 | T4 扫描/知识             | `GATED`                       | T3                           | #3/#4 仍待独立评分            |
|    5 | T5 正式指标              | `GATED`                       | T3/T4 和合法 holdout         | #7 仍待 runtime/security/perf |
|    6 | T6 产品闭环              | `GATED`                       | T3、获准项目和稳定快照       | #5/#6                         |
|    7 | T7 runtime/security/perf | `GATED`                       | T3/T5、设备与安全复核        | #7                            |
|    8 | T8 Stage 2 CI            | `GATED`                       | T4–T7 稳定产物               | #11                           |
|    9 | T9 发布                  | `GATED`                       | T5–T8、S-09/S-10             | #8                            |

T1 和 T2 的工程侧事项已经完成，Issue #1 的 M0 记录也已关闭。T3 开始需要
外部输入或具名批准，不能由工程侧代填；仓库绿色 CI 或 A2 审计不能替代 S-09
和正式验收。`READY-DOC-01` 已在本轮完成；`READY-ENG-01` 负责 Issue #3
的受限 CommonJS 导出静态盘点，完成后仍不关闭 #3。

## 5. 完成项目前必须出现的证据

```text
docs/evidence/acceptance-2026-12/
  manifest.json
  commands.txt
  dependency-scan/{cases,predictions,results}.json
  incompatible-api/{cases,predictions,results}.json
  replacement-mapping/{cases,predictions,results}.json
  missing-port/{cases,predictions,results}.json
  runtime/{target-matrix-results.json,device-sdk-logs/}
  parity/{comparison.json,comparison.md}
  security/{threat-review.md,audit.json,license-review.md}
  performance/benchmark.json
  release/{SBOM.cdx.json,THIRD-PARTY-NOTICES.json,SHA256SUMS,download-smoke.json,github-atomgit-readback.json}
  acceptance-signoff.md
```

公开仓库只能包含哈希、公开来源、许可证、聚合结果、命令和不敏感日志；不得
包含隐藏标签、凭据、签名密钥、私有源码或作者本机绝对路径。

## 6. 状态判定

| 标记        | 含义                                     |
| ----------- | ---------------------------------------- |
| `[x]`       | 当前有可复核证据，且证据路径已记录       |
| `[ ]`       | 尚未完成                                 |
| `READY`     | 工程输入足够，可以立即执行               |
| `IN REVIEW` | 实现完成，等待 PR/CI 或合并验证          |
| `GATED`     | 等待具名批准、外部数据、运行时或发布授权 |
| `BLOCKED`   | 前置条件已确认失败，需记录原因和重试条件 |

CI 绿灯、作者 fixture、本地制品、截图、模型评审和历史运行都只是工程证据。
正式验收还必须具备独立 holdout、实际 runtime、安全/性能/许可处置和最终签字。

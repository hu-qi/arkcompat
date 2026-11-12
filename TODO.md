# ArkCompat 项目执行 TODO

**更新时间：** 2026-11-12
**目标验收日：** 2026-12-23
**当前 main 基线：** `4537668c11e834969518fad2c9c67fed9929a0e0`；状态收口 PR [#114](https://github.com/hu-qi/arkcompat/pull/114) 已合并，[PR 流水线 43232823593](https://github.com/hu-qi/arkcompat/actions/runs/43232823593) 与 [main 流水线 43233201954](https://github.com/hu-qi/arkcompat/actions/runs/43233201954) 的五项必需 job 全部成功。
**当前远端：** GitHub `origin/main` 与 AtomGit（即 GitCode）`atomgit-https/main` 均已独立读回上述 SHA。
**当前状态：** 7 个开放 Issue（#3、#4、#5、#6、#7、#8、#11）、0 个开放 PR、A1/A2 工程切片 `DONE`；A3–A8 为 `GATED`，`READY-ENG-01` 可执行。Issue #1 已于 2026-11-12 结项；正式验收 0/5、人工决定 0/10。

本文是 ArkCompat 剩余工作的**唯一执行入口**，也是长期维护文档。每次开始工作先在这里选择一个 `READY` 工作包；`GATED` 项必须先取得具名人工决定或外部输入。工程实现、CI 绿灯、开发者 fixture、本地制品和模型评审都不能替代正式验收。

## 文档索引

这份文档是执行入口；其他文档只承担专项记录：

| 文档                                                   | 何时使用                                       |
| ------------------------------------------------------ | ---------------------------------------------- |
| [项目完成 TODO](docs/PROJECT-TODO.md)                  | 按 T1–T9 勾选工程和人工工作                    |
| [项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md)       | 查原子任务、依赖、命令和证据                   |
| [项目总控 TODO](docs/PROJECT-MASTER-TODO.md)           | 查里程碑、Issue 和总交付快照                   |
| [项目完成行动清单](docs/PROJECT-COMPLETION-ACTIONS.md) | 按 Issue 核对关闭路线                          |
| [项目完成计划](docs/PROJECT-COMPLETION-PLAN.md)        | 查阶段 A–E、排期和正式证据目录                 |
| [验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md) | 填写 S-01–S-10 具名人工决定                    |
| [交付状态](docs/DELIVERY-STATUS.md)                    | 对外说明已验证工程和未完成门禁                 |
| [供应链审计](docs/SUPPLY-CHAIN-AUDIT.md)               | 复现依赖漏洞、许可证、SBOM、通知和制品哈希审计 |
| [能力缺口矩阵](docs/CAPABILITY-GAP-MATRIX.md)          | 查扫描器、规则、知识和评测的逐项实现边界       |
| [源码 API 清单](docs/SOURCE-API-INVENTORY.md)          | 查 JS/TS/ETS 静态 inventory 的支持与弃答边界   |

执行顺序是：从第 3 节领取一个 `READY` 工作包；在台账确认依赖；在签字包记录
所需人工决定；完成后按第 9 节合并、验证 main、同步 AtomGit 和评论 Issue。

## 0. 当前执行看板

**结论：** 项目正式验收和发布门禁尚未完成，当前 7 个开放 Issue 必须保持开放。M0 Issue #1 已结项，作为历史里程碑保留。A1 的 13 项安全负例与资源边界已通过 PR #109 合并；A2 的依赖、许可证、SBOM、通知、制品哈希和可复现性证据已通过 PR #111 合并；项目执行文档已通过 PR #113 合并，PR/main 五项必需检查均通过。因此 A1/A2 工程切片为 `DONE`。独立安全复核、性能预算、正式指标、S-09 法务/安全处置和最终裁定仍使 #7/#8 开放。

当前只有一项可立即执行的工作：

- `READY-ENG-01`：在 Issue #3 下增加受限 CommonJS 导出追踪；只记录静态声明，不执行源码，不把静态导出当成运行时兼容性证据。

其余工程输入仍等待具名人员、授权数据、实际运行时或发布授权。工程 PR、绿色 CI、作者 fixture、本地制品或模型评审都不能替代正式验收。

### 0.1 行动登记规则

下面 A1–A8 是唯一的工作包编号。状态只使用第 2 节定义。责任角色描述“谁应对此负责”，除非该行另行写明姓名，否则**不代表人员已经任命**。Issue 的关闭结论必须以 Issue 原始验收条件、具名签字和不可变 evidence 为准；A 工作包完成不自动等于 Issue 可关闭。

### 0.2 可执行行动台账

| ID / 状态            | 工作与责任角色                                                                                                   | 目标日期                                  | 输入与前置条件                                                                                   | 具体交付物                                                                                                                                    | 下一步命令 / 动作                                                                                                               | 证据落点                                                                                                                           | 关闭条件与 Issue 权限                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **A1 · DONE**        | M5-05 安全负例与资源边界；Engineering Lead + Security Reviewer                                                   | 2026-11-15                                | 当前 main、现有安全回归、一次性隔离目录；复核人待具名                                            | 13 项路径、symlink、socket、资源上限、协作式超时、秘密泄漏、报告注入、脚本零执行矩阵及残余风险                                                | 已合并 PR #109；PR 与 main 五项必需 job 全部通过；在 Issue #7 记录证据与剩余门禁，并读回 AtomGit 同 SHA                         | `tests/security-matrix.test.ts`；`docs/evidence/security-negative-matrix-2026-11-12.json`；`docs/SCANNER-SECURITY.md`；PR/main run | 工程切片完成；独立安全复核、性能预算和最终裁定仍使 #7 保持开放                                   |
| **A2 · DONE**        | M5-07 供应链与分发审计；Engineering Lead + Security Reviewer + Legal/Release Owner                               | 2026-11-22                                | 当前 main；冻结 lockfile；生产依赖；待具名审查人                                                 | `pnpm audit` 结果、CycloneDX SBOM、第三方通知、许可清单、制品 SHA-256、缺口和处置；覆盖 `@yarnpkg/lockfile@1.1.0` 无独立 LICENSE 文件         | 工程审计已通过 PR #111 合并，PR/main 五项必需 job 全部通过；下一步提交 S-09 法务/安全审查 | `docs/SUPPLY-CHAIN-AUDIT.md`；`docs/evidence/supply-chain-audit-2026-11-12.json`；`docs/RUNTIME-PROVENANCE.md`；PR/main run        | 工程证据已进入 S-09；未完成法务/安全处置时 **不能关闭 #7/#8，不能发布**                      |
| **A3 · GATED**       | 准备并取得 S-01–S-10 人工决定；Project Owner + Final Adjudicator + named independent roles                       | 2026-11-15 提交审阅；决定不得晚于其阻塞项 | A1/A2 可审材料；现有协议、目标矩阵、角色模板；**具名人员、授权 holdout 和签字尚未提供**          | 每项记录“批准/修订批准/拒绝/延期”、姓名/组织、日期、理由、证据、利益冲突、访问边界、重审条件                                                  | 审阅 `docs/ACCEPTANCE-SIGNOFF-PACKAGE.md`；先确认 S-01/S-02/S-03–S-07；在具名角色和许可明确前保持 `GATED`                       | 签字包、`DECISIONS.md`、`TARGET-MATRIX.md` 和后续 Issue 证据                                                                       | 冻结正式分母、运行时、holdout、角色和发布路线；未签字不得由工程侧代填，也不得据此关闭后续 Issue   |
| **A4 · GATED**       | 冻结范围内扫描与知识缺口；Engineering Lead + Independent Label Provider + Non-author Reviewer                    | 2026-11-29                                | S-01、S-03–S-07 已签；获许可 reviewed 数据和具名评审；当前尚无正式 reviewed 快照                 | 范围内依赖/workspace/JS/TS/ArkTS 缺口回归；reviewed 替换记录；确定性知识导出；未知和弃答保持可见                                              | 按 `CAPABILITY-GAP-MATRIX.md` 逐行处置；每条先写失败 fixture；导出并比较 canonical snapshot SHA                                 | `docs/evidence/acceptance-2026-12/`、knowledge snapshot、gap disposition、PR/main run                                              | 无未归属范围内缺口；reviewed 数据来源/许可/有效期/撤回规则齐全；仍 **不能单独关闭 #3/#4**        |
| **A5 · GATED**       | 独立 holdout、正式指标与运行时矩阵；Independent Label Provider + Engineering + Runtime Owner + Final Adjudicator | 2026-12-06 预测冻结；2026-12-13 裁定      | A3 具名角色和冻结 manifest；A4 reviewed snapshot；批准设备/SDK/API 与 holdout 许可；当前均未落实 | label-blind predictions、四项完整 TP/FP/FN 分母、知识库交付证据、API 20+ 实际 runtime 结果、失败与整改记录                                    | 先冻结 code/rules/knowledge/cases/labels/toolchain/device manifest；工程只读 cases 生成 predictions，标签方与裁定人离线评分     | `docs/evidence/acceptance-2026-12/{dependency-scan,incompatible-api,replacement-mapping,missing-port,runtime}/` 及签名裁定         | 四项阈值和知识库通过、无未处置阻断、独立签字；仅此证据链满足正式指标，**仍不能单独关闭 #7**      |
| **A6 · GATED**       | 产品闭环与入口 parity；Engineering Lead + Product Owner + Runtime/Release Owner                                  | 2026-12-13                                | S-02 已签；获准真实项目；A4/A5 稳定快照；可用的干净宿主与真实设备                                | scan→navigate→query→recommend→export；CLI、VS Code/Cursor、DevEco、Web、MCP、CI 的安装、首跑、取消/损坏输入、恢复、卸载/回滚和 finding parity | 建立 canonical fixture/report；逐入口自动比较 finding ID/status/evidence/location；保留宿主与工具链版本                         | `docs/evidence/acceptance-2026-12/parity/`、真实项目 walkthrough、产品签字                                                         | 承诺入口从干净环境通过且延期项有具名批准；工程 smoke 不足，**不能关闭 #5/#6**                    |
| **A7 · GATED**       | Stage 2 CI 门禁；Engineering Lead + Final Adjudicator                                                            | 2026-12-15                                | A4–A6 的稳定输入；S-07 数据隔离；最终 required-check 名单                                        | benchmark、rules/knowledge provenance、跨入口 parity、package/SBOM/checksum、clean-install/download smoke；每项故意失败和恢复证据             | 为每类门禁先提交安全负例，确认 required job 阻断，再撤销探针并验证 main；读回分支保护                                           | workflow、PR/main run URL、失败/恢复 run、保护 API 输出                                                                            | 每类坏输入都被 required check 阻断；只新增 YAML 不算完成，**不能单独关闭 #11**                   |
| **A8 · GATED**       | accepted SHA 重建、发布与交接；Release Owner + Final Adjudicator + Project Owner                                 | 2026-12-23                                | A5–A7 全部通过；S-09/S-10 已签；accepted SHA、签名/校验路线和发布渠道已批准                      | tag/release、CLI tarball、VSIX、DevEco ZIP、Web bundle、source archive、SBOM、notices、checksums、download smoke 和回滚记录                   | 从 accepted SHA 两次干净构建；安装全部制品；发布后从 GitHub/AtomGit 读回 main/tag SHA 和制品哈希；完成维护交接                  | release assets、`SHA256SUMS`、readback JSON、最终验收包、main run                                                                  | 所有原始 Issue 条件满足或具名延期；验收方可脱离作者机器复现；只有此时关闭可关闭 Issue 并进入维护 |

### 0.3 当前可立即执行与等待外部输入

| 队列         | 现在可以做什么                                                                                     | 不能做什么                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `READY`      | 执行 `READY-ENG-01`；使用独立分支、PR、证据和 Issue #3 评论                                       | 不得把完成工程切片等同于关闭 #3；不得激活 Lottie 候选                              |
| 工程 `DONE`  | A1/A2 工程切片已有不可变证据；可在不改变结论的前提下补充回归和文档                                 | 不得把作者 fixture、模型评审或本地包当作独立验收                                   |
| 人工 `GATED` | A3 准备签字材料并催请项目负责人、独立评审者、标签方、法务和发布负责人具名确认                      | 不得替任何人签字，不得臆造 holdout、设备、SDK 或发布许可                           |
| 解锁后       | A4 关闭范围内缺口，A5 运行正式评分和 runtime，A6 做真实项目与入口 parity，A7 加 Stage 2 CI，A8 发布 | 不得跳过上游门禁，不得因某项 CI 绿灯关闭原始 Issue                                 |

S-09 仍须决定 `@yarnpkg/lockfile@1.1.0` 的通知缺口、第三方条款、商标与分发路线。
`READY-ENG-01` 完成后，#3 仍因冻结范围、真实项目和独立评测保持开放。

## 1. 文档职责

| 文档                                                   | 唯一职责                                                               | 负责人 / 维护者                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------ |
| 本文                                                   | 选择下一项工作、查看总清单、依赖顺序、周计划、Issue 关闭条件和执行流程 | 工程执行者维护事实；项目负责人确认范围与签字状态 |
| [项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md)       | 原子任务、依赖、命令、制品、证据、责任角色和关闭条件                   | 工程执行者维护；各证据责任角色复核               |
| [验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md) | S-01–S-10 人工决定、冻结记录、正式结果和最终签字                       | 项目负责人、独立评审者和最终裁定人签署           |
| [项目总控 TODO](docs/PROJECT-MASTER-TODO.md)           | 里程碑、Issue 和完成定义的全局快照                                     | 工程执行者维护，项目负责人确认                   |
| [项目完成行动清单](docs/PROJECT-COMPLETION-ACTIONS.md) | 按 Issue 查看关闭路线                                                  | 工程执行者维护；项目负责人确认关闭               |
| [项目完成计划](docs/PROJECT-COMPLETION-PLAN.md)        | A–E 阶段、依赖、排期和证据目录                                         | 工程执行者与项目负责人共同维护                   |
| [交付状态](docs/DELIVERY-STATUS.md)                    | 对外说明已验证工程、未完成门禁和发布状态                               | 工程执行者起草；发布负责人确认                   |

状态冲突时，以已合并的 Issue 评论、具名人工签字和不可变 evidence 为准，并在下一次文档 PR 中同步修正。文档中的提交与流水线编号是已经发生的历史核对基线；不要为了追随每次纯文档合并而改写它们。`TODO.md` 不因项目进入发布阶段而删除；它承担长期的项目状态与后续维护入口。

## 2. 状态口径

| 状态      | 含义                                                           |
| --------- | -------------------------------------------------------------- |
| `DONE`    | 实现和保留证据已存在；不等于正式验收或 Issue 关闭              |
| `READY`   | 当前输入足够，工程可以立即执行                                 |
| `GATED`   | 下一步需要具名负责人、独立数据、目标运行时、法律审查或发布授权 |
| `BLOCKED` | 已确认前置条件失败；必须记录原因和重试条件                     |
| `[x]`     | 已有可复核证据；依赖人工批准的结论仍须另列签字状态             |
| `[ ]`     | 尚未满足完成条件                                               |

项目负责人已确认：原创代码采用 MIT；最低目标为 HarmonyOS 6.0.0+ / API 20+；正式阈值为依赖扫描正确率 ≥80%、有把握的替代库识别正确率 100%、不兼容 API 识别率 ≥80%、缺失鸿蒙移植识别率 ≥80%，并交付可验证的替换关系知识库。MIT 和阈值确认不替代 S-01–S-10 的范围、评分、角色、数据和发布决定。

## 3. 当前执行队列

一次只领取一项。每项使用独立分支、独立 Issue 关联、新证据目录、PR 和正常合并流程。完成后必须记录提交 SHA、命令、宿主/工具链版本、输入与输出哈希、已知限制；随后验证 main、同步 AtomGit，并只在 Issue 原始完成条件全部满足时关闭 Issue。

| 顺序 | 工作包                   | Issue  | 当前状态      | 本轮工程交付                                                               | 完成后是否可关闭 Issue |
| ---: | ------------------------ | ------ | ------------- | -------------------------------------------------------------------------- | ---------------------- |
|    1 | M5-05 安全负例与资源边界 | #7     | `DONE`        | 13 项威胁矩阵、协作式超时、残余风险和处置记录已合并；PR/main 五项 job 通过 | 否                     |
|    2 | M5-07 供应链与分发审计   | #7、#8 | `DONE`（工程） | audit、CycloneDX SBOM、通知、许可证、制品哈希和分发缺口；S-09 仍待人工处置 | 否                     |

### 3.1 M3-05 · 报告契约与稳定字节（工程完成）

1. **关联 Issue / 里程碑：** [#5](https://github.com/hu-qi/arkcompat/issues/5) / M3。
2. **验收条件：** JSON、Markdown 和 SARIF schema 有效；相同输入重复导出字节稳定；CLI 与 Web 的 finding ID、status、证据、位置、目标 profile 和快照版本语义一致；仅展示层差异有测试和说明。
3. **必需输入：** `fixtures/developer/source-api`；ArkTS；HarmonyOS `6.0.0`；API 20；当前规则/知识快照。不得读取隐藏标签或上传源码。
4. **执行命令：**

   ```sh
   report_dir=$(mktemp -d)
   pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 \
     --api-level 20 --format json > "$report_dir/first.json"
   pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 \
     --api-level 20 --format json > "$report_dir/second.json"
   pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 \
     --api-level 20 --format markdown > "$report_dir/report.md"
   pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 \
     --api-level 20 --format sarif > "$report_dir/report.sarif"
   cmp "$report_dir/first.json" "$report_dir/second.json"
   shasum -a 256 "$report_dir"/*
   pnpm exec vitest run tests/reports.test.ts tests/scan.test.ts \
     tests/assessment.test.ts tests/web-viewer.test.ts
   pnpm check
   ```

5. **输出制品：** 两份 JSON、一份 Markdown、一份 SARIF、SHA-256 清单、CLI/Web 字段对照表和 schema 验证日志。
6. **证据路径：** `docs/evidence/report-stability-2026-11-12.json`；必要时同步更新 [REPORT-FORMATS](docs/REPORT-FORMATS.md)。
7. **完成证据：** [report-stability-2026-11-12.json](docs/evidence/report-stability-2026-11-12.json)；聚焦回归 5 个文件、74 项测试通过；`pnpm check` 36 个文件、575 项测试及文档完整性通过。
8. **完成判据：** 所有 schema 验证通过；相同输入重复渲染字节一致；finding 不丢失、顺序不漂移、unknown 不省略；CLI/Web 稳定字段一致；SARIF 的 finding、位置和 coverage 与 canonical report 一致。
9. **已知限制：** 开发者 fixture 只能证明确定性和投影语义，不能证明正式扫描准确率；Web 的展示排序或 DOM 结构差异不能改变 canonical finding。
10. **是否可关闭 Issue：** **否。** #5 仍需获准真实项目 walkthrough、独立干净主机、公开 beta、产品验收及相关人工签字。

### 3.2 M5-05 · 安全负例与资源边界

1. **关联 Issue / 里程碑：** [#7](https://github.com/hu-qi/arkcompat/issues/7) / M5；补强 #3 的扫描安全证据。
2. **验收条件：** 对路径逃逸、绝对路径、`..`、符号链接、FIFO/设备等特殊文件、损坏/超大/深层输入、CPU/内存/时间限制、secret 泄漏、报告注入和包脚本零执行建立完整威胁矩阵；无未处置高风险，中风险有负责人、期限和决定。
3. **必需输入：** 现有安全回归和 [SCANNER-SECURITY](docs/SCANNER-SECURITY.md)；一次性隔离目录；当前 Node/pnpm/OS 版本；测试用伪造 secret；不得使用真实凭据或私有项目。
4. **执行命令：**

   ```sh
   evidence_dir=$(mktemp -d)
   pnpm exec vitest run tests/scan.test.ts tests/npm-lock.test.ts \
     tests/pnpm-lock.test.ts tests/yarn-lock.test.ts tests/ohpm-manifest.test.ts \
     tests/ohpm-modules.test.ts tests/npm-workspaces.test.ts \
     tests/pnpm-workspaces.test.ts tests/yarn-workspaces.test.ts \
     tests/source-api.test.ts tests/api-rules.test.ts tests/reports.test.ts \
     tests/knowledge-file.test.ts tests/mcp.test.ts tests/ci-action.test.ts \
     tests/evaluation.test.ts
   pnpm check
   ```

   在一次性目录另做宿主探针：创建会写 marker 的 npm lifecycle scripts，扫描后确认 marker 不存在；创建越界/绝对路径/symlink/FIFO/超限/损坏输入，记录退出码与 stderr。把命令、宿主版本和结果写入 `"$evidence_dir"`，再整理为仓库证据。

5. **输出制品：** 威胁矩阵、命令日志、输入哈希、预期/实际/退出码、严重度、处置、负责人、期限和回归用例名。
6. **证据路径：** `docs/evidence/security-negative-matrix-2026-11-12.json`；同步更新 [SCANNER-SECURITY](docs/SCANNER-SECURITY.md)。
7. **完成证据：** 聚焦矩阵 13/13 通过；PR #109 合并时 `pnpm check` 为 37 个测试文件、588 项测试，加入 A2 回归后当前为 589 项，语句/分支/函数/行覆盖率分别为 94.89%/92.65%/98.13%/96.79%，58 个 Markdown 文档检查通过；PR #109 合并为 `0c94cd1487342081ec1d1109b372a0a37b4d385e`，PR 流水线 [43215560601](https://github.com/hu-qi/arkcompat/actions/runs/43215560601) 与当前 main 流水线 [43217340260](https://github.com/hu-qi/arkcompat/actions/runs/43217340260) 的五项必需 job 均通过。证据见 [security-negative-matrix-2026-11-12.json](docs/evidence/security-negative-matrix-2026-11-12.json)。
8. **完成判据：** 所有已测试威胁有明确结果；包脚本执行次数为 0；越界输入显式失败或标记 `unknown`；作者侧无未处置高风险；残余中风险有责任角色且保持开放。A1 工程切片完成，独立安全复核、性能预算和最终裁定仍由 #7 跟踪。
9. **已知限制：** 协作式超时不能中断已进入的同步解析；CPU/峰值内存、目录 TOCTOU、其他 OS 特殊文件和真实恶意供应链仍待独立复核；本机回归不等于独立安全认证。
10. **是否可关闭 Issue：** **否。** #7 仍需独立安全复核、正式指标、运行时矩阵、性能/许可审查和最终裁定。

### 3.3 M5-07 · 供应链与分发审计

1. **关联 Issue / 里程碑：** [#7](https://github.com/hu-qi/arkcompat/issues/7)、[#8](https://github.com/hu-qi/arkcompat/issues/8) / M5–M6。
2. **验收条件：** `pnpm audit`、CycloneDX SBOM、第三方通知、许可证清单、制品 SHA-256、商标和分发文件均可复核；阻断项为零或存在具名风险接受；`@yarnpkg/lockfile@1.1.0` 缺少独立 LICENSE 文件的缺口已处置。
3. **必需输入：** 当前冻结的 lockfile 与生产依赖；[RUNTIME-PROVENANCE](docs/RUNTIME-PROVENANCE.md)；MIT 许可证；不包含密钥的干净构建目录。
4. **执行命令：**

   ```sh
   evidence_dir=$(mktemp -d)
   pnpm audit --json > "$evidence_dir/pnpm-audit.json"
   out=$(mktemp -d)
   pnpm package:cli "$out/arkcompat"
   pnpm verify:runtime-provenance "$out/arkcompat"
   pnpm licenses list --prod --json > "$evidence_dir/prod-licenses.json"
   pnpm list --prod --depth Infinity --json > "$evidence_dir/prod-tree.json"
   shasum -a 256 "$out/arkcompat"/SBOM.cdx.json \
     "$out/arkcompat"/THIRD-PARTY-NOTICES.json \
     "$out/arkcompat"/SHA256SUMS > "$evidence_dir/provenance.sha256"
   pnpm check
   ```

   逐项核对生产依赖版本、声明许可、通知文件、SBOM 引用与制品内哈希；对已知许可缺口补充通知或提交具名风险接受。不得提交密钥、真实凭据或未批准的外部数据。

5. **输出制品：** `pnpm-audit.json`、`prod-licenses.json`、`prod-tree.json`、SBOM、第三方通知、SHA-256、缺口登记和处置记录。
6. **证据路径：** [SUPPLY-CHAIN-AUDIT](docs/SUPPLY-CHAIN-AUDIT.md)、`docs/evidence/supply-chain-audit-2026-11-12.json`；同步更新 [RUNTIME-PROVENANCE](docs/RUNTIME-PROVENANCE.md) 和 [CLI-PACKAGE-REHEARSAL](docs/CLI-PACKAGE-REHEARSAL.md)。证据 JSON 至少记录工具版本、命令、依赖总数、漏洞总数、许可证映射、SBOM/通知/校验清单哈希、`@yarnpkg/lockfile@1.1.0` 处置和残余缺口。
7. **完成判据：** 审计和制品 provenance 可复现；许可证/SBOM/通知互相一致；所有漏洞和许可缺口为已修复、无影响且具名接受，或明确阻断发布；证据包含完整命令、版本和哈希。
8. **已知限制：** 漏洞数据随时间变化；工程审计不能替代法务、商标、签名/信任链和正式分发审批；本地包不是公开 release。
9. **是否可关闭 Issue：** **否。** #7 仍需正式验收；#8 仍需 accepted SHA、签名/发布授权、tag/release、下载 smoke 和双远端读回。

## 4. 总交付勾选表

这张表把“工程能做完的事”和“必须由负责人、独立评审或验收方完成的事”分开。只有全部适用项完成，项目才进入正式发布。

### 4.1 剩余工程

- [x] **M5-05 工程实现（#7）**：13 项安全负例与资源边界已通过 PR #109 合并；main CI、独立复核、性能预算和正式裁定仍开放。
- [x] **M5-07 供应链与分发审计（#7/#8）**：冻结依赖后生成 audit、CycloneDX SBOM、第三方通知、许可证清单、制品 SHA-256；形成法务/安全审查包，PR #111 合并且 PR/main 五项 job 通过。`@yarnpkg/lockfile@1.1.0` 通知缺口仍由 S-09 处置。
- [ ] **Stage 2 CI（#11）**：在正式输入具备后加入 benchmark、rules/knowledge provenance、跨入口 parity、release package/SBOM/checksum 和 download smoke 门禁；每个新门禁保留一次故意失败与恢复通过证据。
- [ ] **扫描与知识缺口（#3/#4）**：按已冻结 S-01 范围关闭 in-scope 依赖图、workspace、JS/TS/ArkTS 符号和 unknown 传播缺口；扩充仅含公开可核验来源的 reviewed 知识；确保零 confident recommendation 不被计作 100%。
- [ ] **报告与产品切片（#5）**：完成真实获准项目 walkthrough、CLI beta 安装/升级/离线/损坏输入/恢复/卸载、公开样例和 benchmark 指南。
- [ ] **多入口闭环（#6）**：冻结 v1 入口；完成 CLI、VS Code/Cursor、DevEco、Web、MCP、CI 的安装、运行、取消、错误恢复、卸载/回滚、知识查询和跨入口 finding parity。
- [ ] **发布制品演练（#8）**：从候选 SHA 可重复生成 CLI tarball、VSIX、DevEco ZIP、Web bundle、source archive、SBOM、notices 和校验清单；两轮构建比较，记录所有不可复现项。
- [ ] **文档与交接（#5/#6/#8）**：同步 quick start、支持矩阵、限制、升级/卸载、回滚、知识刷新/撤回、维护责任和发布说明。

### 4.2 人工决策

- [ ] **S-01** 冻结 HarmonyOS/SDK/API/设备/构建/实际运行时矩阵；API 20 编译目标不得冒充 API 20 运行证据。
- [ ] **S-02** 冻结 v1 入口、延期项、DevEco/编辑器分发路线和 Remote AI 默认关闭。
- [ ] **S-03** 冻结四类指标单位、公式、分母和置信区间口径。
- [ ] **S-04** 冻结部分替换、弃答、零推荐及“有把握”的非空覆盖规则。
- [ ] **S-05** 冻结五类 missing-port taxonomy 与否定证据要求。
- [ ] **S-06** 具名指定标签提供者、非作者评审者、最终裁定人和争议处理人。
- [ ] **S-07** 批准 holdout 来源、许可、哈希冻结、盲访问、失败保留和更正流程。
- [ ] **S-08** 对 Lottie 候选作出拒绝、继续搁置或限定入库决定；此前保持本地、未激活、未提交。
- [ ] **S-09** 完成商标、外部数据、第三方通知、许可、安全和分发处置。
- [ ] **S-10** 批准 accepted SHA、tag、签名/校验、发布渠道、回滚负责人和最终验收包。

### 4.3 独立评测

- [ ] 冻结 code、rules、knowledge、cases、labels、工具链、SDK、设备和 profile 的 SHA-256 manifest。
- [ ] 由独立标签提供者交付有许可、完整且隐藏的 holdout；工程侧不读取标签生成预测。
- [ ] 依赖扫描正确率 **≥80%**，输出完整 TP/FP/FN、分母和错误分析。
- [ ] 有把握的替代库识别正确率 **100%**，覆盖非空，零 false confident recommendation。
- [ ] HarmonyOS 6.0.0+/API 20+ 不兼容 API 识别率 **≥80%**，按 profile/category 拆分。
- [ ] 缺失鸿蒙移植识别率 **≥80%**，给出五类混淆矩阵与日期化否定证据。
- [ ] 交付可查询、可导出、带 schema、来源、许可、评审状态、有效期和撤回规则的替换关系知识库。
- [ ] 独立裁定人签字确认结果、失败样本、限制和任何 waiver。

### 4.4 产品与运行时验收

- [ ] S-01 中每个 profile 在对应实际 runtime 完成 signed Release/AOT 或批准的等价构建验证；失败环境明确记录。
- [ ] CLI、VS Code/Cursor、DevEco、Web、MCP、CI 的承诺入口在干净环境安装并完成同一 canonical fixture。
- [ ] 跨入口 finding ID、status、证据、位置、目标 profile、规则/知识快照和 next action 语义一致。
- [ ] 真实获准项目完成 scan → finding → navigate → replacement query → recommendation → export。
- [ ] 产品负责人完成 beta/可用性验收，批准已知限制和延期项。

### 4.5 发布与交接

- [ ] 安全、性能、漏洞、SBOM、通知、许可和商标审查无未处置阻断。
- [ ] 从 accepted SHA 重建全部制品；clean install、download smoke、校验、卸载/回滚通过。
- [ ] 创建正式 tag/release；发布说明列出支持 profile、限制、延期入口和维护责任。
- [ ] GitHub `main`/tag 与 AtomGit（即 GitCode）读回相同代码 SHA；托管制品哈希一致。
- [ ] 验收方能脱离作者本机复现评分与核心流程；知识刷新、撤回、升级、回滚和争议处理已交接。
- [ ] 所有应关闭 Issue 已关闭，最终 main 流水线与文档状态一致。

## 5. 依赖与执行顺序

| 顺序 | 阶段                 | 前置条件                                  | 明确输出                                      | 门禁                    |
| ---: | -------------------- | ----------------------------------------- | --------------------------------------------- | ----------------------- |
|    1 | 工程安全与供应链收口 | A1/A2 已合并，证据可复核 | M5-05/M5-07 结论、风险登记、审查包 | S-09 法务/安全处置及最终验收 |
|    2 | 范围与评分冻结       | S-01–S-07 签字包                          | profile、入口、公式、角色、holdout 治理       | 人工签字                |
|    3 | 扫描与知识闭环       | S-01/S-03–S-05；in-scope gap 清单         | gap 回归、reviewed 知识快照、确定性导出       | 工程回归通过            |
|    4 | 独立 holdout 评分    | S-06/S-07；冻结 manifest；reviewed 知识   | 四项正式指标、完整分母、失败保留              | 达到 80%/100%/≥80%/≥80% |
|    5 | 运行时与安全验收     | S-01；批准设备/构建；M5-05/M5-07          | runtime、安全、性能、许可、漏洞记录           | 独立复核通过            |
|    6 | 产品与入口验收       | S-02；真实项目；知识快照                  | walkthrough、安装/恢复/卸载、parity           | 产品负责人接受          |
|    7 | Stage 2 CI           | 阶段 3–6 的稳定输入                       | benchmark/provenance/parity/release 门禁      | 故意失败与恢复通过      |
|    8 | 发布候选冻结         | S-09；全部工程与正式指标                  | accepted SHA、重建制品、验收包                | 法务/安全无阻断         |
|    9 | 最终签字与发布       | S-10；阶段 8                              | tag/release、下载 smoke、交接                 | 验收方签字              |
|   10 | 双远端收口           | 发布 SHA                                  | GitHub 与 AtomGit 同 SHA/哈希读回             | 远程读回一致            |

硬依赖：S-01–S-05 未冻结时，不能生成正式分母；S-06–S-07 未批准时，不能把模型评审、作者标签或公开 fixture 当成独立结果；S-08 未决定时，Lottie 不进入知识库；S-09 未完成时，不发布制品；S-10 未签署时，不创建正式 tag/release。

## 6. 一周执行计划（至 2026-12-23）

| 周次 | 日期        | 工程动作                                                                                          | 人工/外部动作                                           | 周结束证据与门禁                                     |
| ---- | ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| W1   | 11/12–11/15 | A1/A2 工程切片已合并并完成流水线验证；整理 #7/#8 证据                                  | 负责人逐项填写 S-01–S-07，明确最晚反馈日期              | TODO/CI 基线；安全矩阵；供应链证据；签字状态         |
| W2   | 11/16–11/22 | 按冻结范围关闭 #3 扫描缺口；补齐 reviewed 知识工具                                               | S-01–S-05 冻结；S-06/S-07 具名；S-08 决定是否继续搁置   | 扫描/知识回归；reviewed snapshot；合法 holdout 计划  |
| W3   | 11/23–11/29 | 交付可导出知识库；完成真实项目与多入口 walkthrough；实现 Stage 2 benchmark/provenance/parity 门禁 | 标签提供者冻结 cases/labels；产品负责人参加 walkthrough | #4/#5/#6 工程包；holdout hashes；CI 负例             |
| W4   | 11/30–12/06 | 生成 label-blind predictions；整改首次失败；补齐 CLI beta 发布文档                                | 独立评审和裁定人开始评分                                | 四项指标首次完整结果；缺陷登记；beta 包              |
| W5   | 12/07–12/13 | 修复正式评测缺陷；完成 runtime/performance/security 矩阵；实现 release CI 门禁                    | 运行时负责人提供设备/构建；法务/安全审查 M5-07          | 阈值复核；运行时矩阵；无未处置高风险                 |
| W6   | 12/14–12/20 | 从候选 SHA 双次重建制品；完成 clean install、rollback、parity 和 release rehearsal                | S-09 处置；验收方复核验收包                             | 完整 release candidate、哈希、验收预签               |
| W7   | 12/21–12/23 | 冻结 accepted SHA；发布；下载 smoke；同步 AtomGit 并读回                                          | S-10 签署；最终验收                                     | tag/release；GitHub/AtomGit 同 SHA；Issue 关闭与交接 |

若人工输入逾期，对应行保持 `GATED`，不得用工程默认值填成“已验收”。每周只把已有可复核证据的条目勾选。

## 7. 人工门禁

以下决定集中在[验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register)。工程侧只能准备证据和建议，不能自行代签。

| ID   | 必须决定                                       | 阻塞        |
| ---- | ---------------------------------------------- | ----------- |
| S-01 | HarmonyOS/API/SDK/设备/构建/实际运行时矩阵     | #3/#6/#7    |
| S-02 | v1 承诺入口、延期项和 DevEco 分发路线          | #5/#6/#8    |
| S-03 | 四类指标的单位、公式、分母                     | #4/#7       |
| S-04 | 部分替换、弃答、零推荐和“有把握”规则           | #4/#7       |
| S-05 | 五类缺失移植 taxonomy 和否定证据               | #3/#4/#7    |
| S-06 | 标签提供者、非作者评审、裁定人和争议人         | #4/#7       |
| S-07 | holdout 来源、许可、哈希冻结、盲访问和失败保留 | #4/#7/#11   |
| S-08 | Lottie 候选拒绝、继续搁置或限定入库            | #4/#7       |
| S-09 | 商标、外部数据、第三方通知、法律和分发处置     | #6/#7/#8    |
| S-10 | tag、签名/校验、渠道、回滚人和验收包           | #8          |

Lottie 候选保持本地、未激活、未提交：`/Users/huqi/Documents/Codex/2026-11-10/arkcompat-private-review/lottie-canvas-candidate.json`，SHA-256 `cfdea420d8d96d3ed49602a4354c8ed08dd042e15503792862cac5617f85caee`。没有项目负责人的明确批准，不得导入知识库或产生 confident mapping。

## 8. Issue 关闭矩阵

| Issue                                               | 工程完成                                                      | 人工门禁                     | 正式证据                                                                 | 可关闭 |
| --------------------------------------------------- | ------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------ | ------ |
| [#3](https://github.com/hu-qi/arkcompat/issues/3)   | 多格式扫描、workspace、静态 inventory、确定性和安全边界已具备 | S-01/S-03/S-05/S-06/S-07     | 依赖扫描 ≥80%；不兼容 API ≥80%；独立标签与裁定                           | 否     |
| [#4](https://github.com/hu-qi/arkcompat/issues/4)   | schema、五类判定、离线查询/导出、blind adapters 已具备        | S-03–S-08；reviewed 数据批准 | confident replacement 100% 且覆盖非空；missing-port ≥80%；可导出知识库   | 否     |
| [#5](https://github.com/hu-qi/arkcompat/issues/5)   | 报告、assessment、稳定字节和 CLI 生命周期切片已具备           | S-02；真实项目授权；产品验收 | 完整 walkthrough；独立干净主机；公开 beta                                | 否     |
| [#6](https://github.com/hu-qi/arkcompat/issues/6)   | CLI/VSIX/DevEco/Web/MCP/CI 局部 smoke 已具备                  | S-02/S-09；分发授权          | 完整 parity；安装/恢复/卸载/回滚；宿主矩阵                               | 否     |
| [#7](https://github.com/hu-qi/arkcompat/issues/7)   | 回归、评测骨架、API 20 局部运行时、安全边界已具备             | S-01–S-10                    | M5-05/M5-07；四项正式指标；runtime/performance/security；最终裁定        | 否     |
| [#8](https://github.com/hu-qi/arkcompat/issues/8)   | CLI/VSIX、SBOM/通知/哈希机制可重建                            | S-09/S-10                    | accepted SHA；tag/release；签名或校验；下载 smoke；GitHub/AtomGit 同 SHA | 否     |
| [#11](https://github.com/hu-qi/arkcompat/issues/11) | 五项必需 CI 和分支保护已完成                                  | S-07 及正式输入              | benchmark、provenance、parity、release smoke；故意失败/恢复证据          | 否     |

“可关闭”为“否”表示原始 Issue 完成条件仍未全部满足。工程 PR 合并只能把对应行从 `READY` 推进到工程 `DONE`；人工签字和独立证据完成后才改为“是”。

Issue #1 是已结项的 M0 历史记录：2026-11-12 关闭为 `COMPLETED`。它不再属于当前开放 Issue 或当前阻塞清单；其结论仍作为后续范围、验收和发布工作的历史依据。

## 9. 每次交付的固定流程

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
git diff --check
git add <explicit paths>
git commit -m "<type>: <why>"
git push -u origin <branch>
gh pr create --fill
gh pr checks --watch
gh pr merge --merge
gh run view <merged-main-run-id> --json status,conclusion,jobs
git push atomgit-https main
git ls-remote origin refs/heads/main
git ls-remote atomgit-https refs/heads/main
```

提交前必须确认：变更只属于一个 tracked Issue；测试先行且负例保留；没有 `--no-verify`；没有用 fixture、本地包或绿色 CI 冒充正式验收；Issue 评论包含基线 SHA、PR/main run、命令、输入/输出哈希、完整分母和限制。

## 10. 项目完成定义

项目只有同时满足以下条件才可标记完成：

- 7 个开放 Issue（#3、#4、#5、#6、#7、#8、#11）的原始完成条件均已满足，或由负责人正式批准延期并记录风险、责任人和新日期；
- 四项正式指标在获许可的独立 holdout 上按冻结规则评分，完整分母和失败结果公开；
- reviewed、可查询、可导出的替换关系知识库已交付；
- 所有承诺入口可安装、运行、恢复、卸载/回滚，并对 canonical fixture 产生语义一致的 finding；
- 运行时、安全、性能、漏洞、SBOM、通知、许可和制品验证无未处置阻断；
- 从 accepted SHA 重建制品，在干净环境通过下载、校验和安装 smoke；
- GitHub 与 AtomGit 的 main/tag 指向同一代码 SHA，托管制品哈希一致；AtomGit 与 GitCode 是同一同步目标，只维护一个权威读回，不声称两次独立同步；
- 验收方不依赖作者本机即可复现，维护责任、刷新周期、撤回流程和升级/卸载已交接；
- 所有应关闭 Issue 已关闭，最终 main 流水线通过，长期 `TODO.md` 与证据状态一致。

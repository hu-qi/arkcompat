# ArkCompat 项目执行 TODO

**更新时间：** 2026-11-12
**目标验收日：** 2026-12-23
**当前主线基线：** `511790bcdac6f19bbc0dc53089336c16aeae9896`
**权威主干流水线：** [43202341237](https://github.com/hu-qi/arkcompat/actions/runs/43202341237)，五项必需 job 全部通过
**当前状态：** 8 个开放 Issue、0 个开放 PR、3 个工程 `READY` 工作包、正式验收 0/5、人工签字 0/10

本文是 ArkCompat 剩余工作的**唯一执行入口**，也是长期维护文档。每次开始工作先在这里选择一个 `READY` 工作包；`GATED` 项必须先取得具名人工决定或外部输入。工程实现、CI 绿灯、开发者 fixture、本地制品和模型评审都不能替代正式验收。

需要直接执行的文档顺序是：

1. 从本文第 3 节领取一个 `READY` 工作包，并复制其中的 Issue、命令、证据路径和完成判据。
2. 到[项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md)查看该工作包的依赖、责任角色和上游/下游任务。
3. 遇到 S-01–S-10 时，在[验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md)记录具名决定；工程侧不得代签。
4. 从[项目完成计划](docs/PROJECT-COMPLETION-PLAN.md)查看阶段 A–E 的整体顺序和正式证据目录。
5. 用[项目总控 TODO](docs/PROJECT-MASTER-TODO.md)、[完成行动清单](docs/PROJECT-COMPLETION-ACTIONS.md)和[交付状态](docs/DELIVERY-STATUS.md)复核 Issue 关闭条件与对外口径。

## 1. 文档职责

| 文档 | 唯一职责 |
|---|---|
| 本文 | 选择下一项工作、查看当前状态和执行顺序 |
| [项目执行台账](docs/PROJECT-EXECUTION-LEDGER.md) | 原子任务、依赖、命令、制品、证据、责任角色和关闭条件 |
| [验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md) | S-01–S-10 人工决定、冻结记录、正式结果和最终签字 |
| [项目总控 TODO](docs/PROJECT-MASTER-TODO.md) | 里程碑、Issue 和完成定义的全局快照 |
| [项目完成行动清单](docs/PROJECT-COMPLETION-ACTIONS.md) | 按 Issue 查看关闭路线 |
| [项目完成计划](docs/PROJECT-COMPLETION-PLAN.md) | A–E 阶段、依赖、排期和证据目录 |
| [交付状态](docs/DELIVERY-STATUS.md) | 对外说明已验证工程、未完成门禁和发布状态 |

状态冲突时，以已合并的 Issue 评论、具名人工签字和不可变 evidence 为准，并在下一次文档 PR 中同步修正。`TODO.md` 不因项目进入发布阶段而删除；它承担长期的项目状态与后续维护入口。

## 2. 状态口径

| 状态 | 含义 |
|---|---|
| `DONE` | 实现和保留证据已存在；不等于正式验收或 Issue 关闭 |
| `READY` | 当前输入足够，工程可以立即执行 |
| `GATED` | 下一步需要具名负责人、独立数据、目标运行时、法律审查或发布授权 |
| `BLOCKED` | 已确认前置条件失败；必须记录原因和重试条件 |
| `[x]` | 已有可复核证据；依赖人工批准的结论仍须另列签字状态 |
| `[ ]` | 尚未满足完成条件 |

项目负责人已确认：原创代码采用 MIT；最低目标为 HarmonyOS 6.0.0+ / API 20+；正式阈值为依赖扫描正确率 ≥80%、有把握的替代库识别正确率 100%、不兼容 API 识别率 ≥80%、缺失鸿蒙移植识别率 ≥80%，并交付可验证的替换关系知识库。MIT 和阈值确认不替代 S-01–S-10 的范围、评分、角色、数据和发布决定。

## 3. 当前执行队列

一次只领取一项。每项使用独立分支、独立 Issue 关联、新证据目录、PR 和正常合并流程。完成后必须记录提交 SHA、命令、宿主/工具链版本、输入与输出哈希、已知限制；随后验证 main、同步 AtomGit，并只在 Issue 原始完成条件全部满足时关闭 Issue。

| 顺序 | 工作包 | Issue | 当前状态 | 本轮工程交付 | 完成后是否可关闭 Issue |
|---:|---|---|---|---|---|
| 1 | M3-05 报告契约与稳定字节 | #5 | `READY` | JSON/Markdown/SARIF schema、重复导出哈希、CLI/Web 语义 parity | 否 |
| 2 | M5-05 安全负例与资源边界 | #7 | `READY` | 威胁矩阵、隔离探针、失败样例和处置记录 | 否 |
| 3 | M5-07 供应链与分发审计 | #7、#8 | `READY` | audit、CycloneDX SBOM、通知、许可证、制品哈希和分发缺口 | 否 |

### 3.1 M3-05 · 报告契约与稳定字节

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
7. **完成判据：** 所有 schema 验证通过；相同输入两次 JSON 字节一致；finding 不丢失、顺序不漂移、unknown 不省略、路径/秘密不泄漏；CLI/Web 稳定字段一致或差异有回归测试与书面理由。
8. **已知限制：** 开发者 fixture 只能证明确定性和投影语义，不能证明正式扫描准确率；Web 的展示排序或 DOM 结构差异不能改变 canonical finding。
9. **是否可关闭 Issue：** **否。** #5 仍需获准真实项目 walkthrough、独立干净主机、公开 beta、产品验收及相关人工签字。

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
5. **输出制品：** 威胁矩阵、隔离主机命令日志、输入哈希、预期/实际/退出码、严重度、处置、负责人、期限和回归用例名。
6. **证据路径：** `docs/evidence/security-negative-matrix-2026-11-12.json`；同步更新 [SCANNER-SECURITY](docs/SCANNER-SECURITY.md)。
7. **完成判据：** 所有已测试威胁有明确结果；包脚本执行次数为 0；越界输入显式失败或标记 `unknown`；无未处置高风险；中风险均有具名责任和到期日。
8. **已知限制：** 本机回归和隔离目录探针不等于独立安全认证；容器/文件系统差异、真实恶意供应链和 OS 特有能力仍需独立复核。
9. **是否可关闭 Issue：** **否。** #7 仍需独立安全复核、正式指标、运行时矩阵、性能/许可审查和最终裁定。

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
   shasum -a 256 "$out/arkcompat"/SBOM.cdx.json \
     "$out/arkcompat"/THIRD-PARTY-NOTICES.json \
     "$out/arkcompat"/SHA256SUMS > "$evidence_dir/provenance.sha256"
   pnpm check
   ```

   逐项核对生产依赖版本、声明许可、通知文件、SBOM 引用与制品内哈希；对已知许可缺口补充通知或提交具名风险接受。不得提交密钥、真实凭据或未批准的外部数据。
5. **输出制品：** audit JSON、SBOM、第三方通知、许可清单、SHA-256、缺口登记和处置记录。
6. **证据路径：** `docs/evidence/supply-chain-audit-2026-11-12.json`；必要时更新 [RUNTIME-PROVENANCE](docs/RUNTIME-PROVENANCE.md) 和 [CLI-PACKAGE-REHEARSAL](docs/CLI-PACKAGE-REHEARSAL.md)。
7. **完成判据：** 审计和制品 provenance 可复现；许可证/SBOM/通知互相一致；所有漏洞和许可缺口为已修复、无影响且具名接受，或明确阻断发布；证据包含完整命令、版本和哈希。
8. **已知限制：** 漏洞数据随时间变化；工程审计不能替代法务、商标、签名/信任链和正式分发审批；本地包不是公开 release。
9. **是否可关闭 Issue：** **否。** #7 仍需正式验收；#8 仍需 accepted SHA、签名/发布授权、tag/release、下载 smoke 和双远端读回。

## 4. 人工门禁

以下决定集中在[验收与发布签字包](docs/ACCEPTANCE-SIGNOFF-PACKAGE.md#2-decision-register)。工程侧只能准备证据和建议，不能自行代签。

| ID | 必须决定 | 阻塞 |
|---|---|---|
| S-01 | HarmonyOS/API/SDK/设备/构建/实际运行时矩阵 | #1/#3/#6/#7 |
| S-02 | v1 承诺入口、延期项和 DevEco 分发路线 | #1/#5/#6/#8 |
| S-03 | 四类指标的单位、公式、分母 | #1/#4/#7 |
| S-04 | 部分替换、弃答、零推荐和“有把握”规则 | #1/#4/#7 |
| S-05 | 五类缺失移植 taxonomy 和否定证据 | #1/#3/#4/#7 |
| S-06 | 标签提供者、非作者评审、裁定人和争议人 | #1/#4/#7 |
| S-07 | holdout 来源、许可、哈希冻结、盲访问和失败保留 | #4/#7/#11 |
| S-08 | Lottie 候选拒绝、继续搁置或限定入库 | #4/#7 |
| S-09 | 商标、外部数据、第三方通知、法律和分发处置 | #6/#7/#8 |
| S-10 | tag、签名/校验、渠道、回滚人和验收包 | #8 |

Lottie 候选保持本地、未激活、未提交：`/Users/huqi/Documents/Codex/2026-11-10/arkcompat-private-review/lottie-canvas-candidate.json`，SHA-256 `cfdea420d8d96d3ed49602a4354c8ed08dd042e15503792862cac5617f85caee`。没有项目负责人的明确批准，不得导入知识库或产生 confident mapping。

## 5. Issue 关闭矩阵

| Issue | 当前工程状态 | 仍未满足的关闭条件 |
|---|---|---|
| [#1](https://github.com/hu-qi/arkcompat/issues/1) | 验收协议、目标矩阵、决策候选稿已具备 | S-01–S-07 具名签字、独立角色、holdout 许可、样例评分和最终裁定 |
| [#3](https://github.com/hu-qi/arkcompat/issues/3) | 多格式依赖图、workspace、JS/TS/ETS inventory、规则、确定性与安全边界已具备 | 约定范围缺口闭环；依赖扫描 ≥80%；不兼容 API ≥80%；独立标签和裁定 |
| [#4](https://github.com/hu-qi/arkcompat/issues/4) | schema、五类判定、离线导入/查询/导出、五类 blind adapter 已具备 | reviewed 知识库；confident replacement 100% 且 coverage 非空；missing-port ≥80%；Lottie 决定 |
| [#5](https://github.com/hu-qi/arkcompat/issues/5) | 三种报告、assessment、portable CLI 生命周期切片已具备 | M3-05；获准真实项目 walkthrough；独立干净主机；公开 beta；产品验收 |
| [#6](https://github.com/hu-qi/arkcompat/issues/6) | CLI/VSIX/DevEco/Web/MCP/CI 已有局部 smoke | 冻结入口范围；公开分发；完整 parity；安装、恢复、卸载/回滚和宿主矩阵 |
| [#7](https://github.com/hu-qi/arkcompat/issues/7) | 回归、评测骨架、API 20 局部运行时、安全边界已具备 | M5-05；M5-07；正式指标；运行时矩阵；性能/许可/安全审查；最终签字 |
| [#8](https://github.com/hu-qi/arkcompat/issues/8) | CLI/VSIX、SBOM/通知/哈希机制可重建 | accepted SHA；tag/release；签名或校验；下载 smoke；GitHub/AtomGit 同 SHA 读回和交接 |
| [#11](https://github.com/hu-qi/arkcompat/issues/11) | 五项必需 CI 和分支保护已完成 | benchmark、provenance、surface parity、release smoke 门禁及故意失败/恢复证据 |

## 6. 每次交付的固定流程

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
gh run watch <merged-main-run-id> --exit-status
git push atomgit-https main
git ls-remote origin refs/heads/main
git ls-remote atomgit-https refs/heads/main
```

提交前必须确认：变更只属于一个 tracked Issue；测试先行且负例保留；没有 `--no-verify`；没有用 fixture、本地包或绿色 CI 冒充正式验收；Issue 评论包含基线 SHA、PR/main run、命令、输入/输出哈希、完整分母和限制。

## 7. 项目完成定义

项目只有同时满足以下条件才可标记完成：

- 8 个开放 Issue 的原始完成条件均已满足，或由负责人正式批准延期并记录风险、责任人和新日期；
- 四项正式指标在获许可的独立 holdout 上按冻结规则评分，完整分母和失败结果公开；
- reviewed、可查询、可导出的替换关系知识库已交付；
- 所有承诺入口可安装、运行、恢复、卸载/回滚，并对 canonical fixture 产生语义一致的 finding；
- 运行时、安全、性能、漏洞、SBOM、通知、许可和制品验证无未处置阻断；
- 从 accepted SHA 重建制品，在干净环境通过下载、校验和安装 smoke；
- GitHub 与 AtomGit 的 main/tag 指向同一代码 SHA，托管制品哈希一致；
- 验收方不依赖作者本机即可复现，维护责任、刷新周期、撤回流程和升级/卸载已交接；
- 所有应关闭 Issue 已关闭，最终 main 流水线通过，长期 `TODO.md` 与证据状态一致。

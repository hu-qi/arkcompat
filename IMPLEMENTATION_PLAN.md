# ArkCompat v0.1.0 工程验证与修复 · 实施计划

基线：tag `v0.1.0`（annotated，指向 commit `f64d4f33ad188f8fec4b38095e897a3747e3f933`），
Release https://github.com/hu-qi/arkcompat/releases/tag/v0.1.0（8 个附件）。
本轮排除：华为测评、正式准确率裁定、外部最终验收。结论只按实证。

## Stage 1: 基线与工具链门禁
**Goal**: 固定源码/工具链，跑通 frozen install 与 `pnpm check`，记录 audit 与 CI 权威状态。
**Success Criteria**: 安装零错误；格式/ESLint/类型/测试/文档校验全绿或逐条记录失败；输出可复现的基线记录。
**Tests**: `pnpm install --frozen-lockfile --ignore-scripts`；`pnpm check`；`pnpm audit --json`；`gh run list`。
**Status**: In Progress

## Stage 2: Release 制品门禁
**Goal**: 验证 8 个 Release 附件完整性、安全解包、制品内运行时、版本身份、SBOM/通知、可重现构建。
**Success Criteria**: 所有附件 digest 与 SHA256SUMS 一致；解包无路径逃逸/symlink/权限异常；源码外干净目录 CLI 全功能与错误恢复；两次固定工具链重建内容与字节可比；差异有解释。
**Tests**: 下载+digest 校验；tar/zip 枚举；CLI help/scan/explain/export/offline/坏参数/损坏恢复/回滚卸载；内嵌 Node 探测；`0.0.0` vs tag `0.1.0` 身份；SBOM/通知与实际随包依赖比对；两次 `package:release` 比较。
**Status**: Not Started

## Stage 3: 功能入口、安全与性能
**Goal**: 覆盖锁文件矩阵、源码分析、规则/知识、报告契约、真实项目、安全负例与性能基线。
**Success Criteria**: 每类输入有明确 PASS/FAIL/限制；负例不执行脚本、不越界、不注入；性能记录小/中/大基线。
**Tests**: npm/pnpm/Yarn Classic/Berry/OHPM 矩阵；alias/workspace/peer/optional/坏输入；JS/TS/ETS；JSON/Markdown/SARIF schema/确定性/finding ID；公开固定提交项目 scan→定位→解释→查询→导出；安全负例；计时与内存。
**Status**: Not Started

## Stage 4: 缺陷修复与复测
**Goal**: 对 P0/P1 缺陷最小复现→负例红测→最小修复→聚焦+全量门禁→复核。
**Success Criteria**: 无未处理 P0/P1；每项修复有根因/影响/回滚/风险；不降阈值不关测试。
**Tests**: 新增负例测试先红后绿；`pnpm check`；相关入口复测。
**Status**: Not Started

## Stage 5: 收尾与交付文档
**Goal**: 产出验证报告、后续事项与证据索引，纠正历史冲突。
**Success Criteria**: `docs/RELEASE-0.1.0-VERIFICATION.md`、`docs/RELEASE-0.1.0-FOLLOWUPS.md`、`docs/evidence/release-0.1.0-verification/manifest.json` 与索引齐备；README/ROADMAP/DELIVERY-STATUS/DECISIONS 与实证一致；删除本计划文件。
**Tests**: `node scripts/validate-docs.mjs`；`pnpm format:check`；链接与数据一致性抽查。
**Status**: Not Started

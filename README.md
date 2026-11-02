# ArkCompat

> AI-assisted HarmonyOS dependency and API compatibility analysis toolkit.

ArkCompat 是面向前端与跨端开发者的 HarmonyOS 三方库兼容性扫描与适配工具链，目标是分析 NPM/OHPM 依赖及源码 API 调用、识别兼容性风险与缺失生态库、推荐有证据的替代方案，并输出可追溯的迁移报告。

- **开发策略**：TypeScript First；共享核心引擎，多形态入口。
- **产品入口（规划）**：CLI、VS Code/Cursor、DevEco Studio、Web、MCP、CI/CD。
- **首个交付节点**：2026-12-23（HarmonyOS 6.0.0+ 课题验收）。
- **当前状态**：项目规划与工程基线初始化中；**尚未发布可用扫描器**。

> 重要：这是独立开源社区项目，非华为官方发布、认证或背书的产品。兼容性结论需要标明证据级别；AI 推荐不等于验证通过。

详细规划将通过独立 PR 提交，合并后以 [ROADMAP.md](ROADMAP.md) 与 `docs/` 为项目开发依据。

## Links

- [Repository](https://github.com/hu-qi/arkcompat)
- [Original project scope](https://github.com/hu-qi/ohpm-npm-compat-assistant/issues/1) — 仅供需求及历史实现核验，不能视为已交付。

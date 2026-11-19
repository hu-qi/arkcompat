# ArkCompat v0.1.0

ArkCompat (开源鸿蒙三方库兼容性评估引擎) 0.1.0 正式发布。本项目面向 HarmonyOS 6.0.0+ / API 20+ 生态，提供针对 npm / pnpm / Yarn / OHPM 多包管理器及 JS / TS / ArkTS 源码的确定性静态兼容性扫描、五分法移植判定及跨形态产品化入口。

## 📦 多形态制品（Different Artifacts for Different Modalities）

本版本针对不同使用场景与宿主环境，分别构建了独立专属的交付制品：

| 制品文件名 | 适用形态 / 宿主 | 说明 |
|---|---|---|
| `arkcompat-cli-portable.tar.gz` | **终端 / CLI** | 独立便携式命令行运行包，开箱即用，内嵌生产依赖与运行时，无需全局安装源码或 pnpm |
| `arkcompat-deveco.zip` | **DevEco Studio** | 华为官方 DevEco Studio IDE 插件（支持 26.0.0.865 macOS arm64），支持从磁盘安装、菜单触发扫描及源码行级跳转 |
| `arkcompat-vscode.vsix` | **VS Code / Cursor** | VS Code 与 Cursor 编辑器扩展，内嵌独立扫描引擎，支持引擎版本 `^1.128.0` |
| `arkcompat-web.tar.gz` | **Web 查看器** | 纯静态轻量 Web 报告查看器，零运行时 eval，Schema 0.12.0 确定性渲染 |
| `arkcompat-source.tar.gz` | **源码包** | 纯净干净源码包（git archive 校验构建），排除本地缓存与临时制品 |
| `SBOM.cdx.json` | **供应链** | CycloneDX 1.5 格式全量生产依赖软件物料清单 |
| `THIRD-PARTY-NOTICES.json` | **法务与许可** | 包含 243 项依赖的完整许可证清单与上游 BSD-2-Clause 许可补充说明 |
| `SHA256SUMS` | **完整性校验** | 所有发布制品的 SHA-256 校验哈希表 |

## 🛡️ 质量基线与安全性

- **全量测试与覆盖率**：37 个测试文件、593 项自动化单元与集成测试全部通过，核心代码行覆盖率达 96.48%。
- **威胁防护矩阵**：覆盖 13 项安全负例（禁止执行包脚本、阻断路径穿越逃逸、符号链接越界防护及资源用量上限）。
- **供应链安全**：`pnpm audit` 零已知漏洞；原创代码全量采用 MIT 许可证。
- **跨平台流水线**：GitHub Actions 5 项必须任务（`docs-integrity`、`actionlint`、Ubuntu 24.04 Node 22/24、macOS 15 Node 24）全部通过。


# Target & Surface Delivery Matrix · ArkCompat (Stage 1 / Issue #1)

**Status:** Candidate matrix drafted 2026-11-12 for owner sign-off under [DECISIONS](DECISIONS.md) (`D-01`, `D-05`, `D-09`). HarmonyOS **6.0.0 / API 20** is the confirmed minimum engineering floor; rows marked `Pending` are **not** claimed supported.

## 1. Target Runtime & HarmonyOS Matrix (A4)

| Profile ID | OS Release | API Level | Runtime | Device Class / ABI | DevEco SDK / Build Mode | Required Permissions / Capabilities | Current Verification State |
|---|---|---|---|---|---|---|---|
| `hos-6.0-api20-arkts-phone` | `6.0.0` | `20` | `arkts` | Phone (`arm` / `arm64-v8a`) | DevEco CLI 1.3.10+ / Compile SDK 20–26, unsigned debug (emulator) vs. signed release (device) | Explicit per-API (`ohos.permission.INTERNET`, etc.) | **Partially observed** (2026-11-09 API 20 arm emulator caller-log smoke only; 2026-11-11 revised lifecycle probe not yet run on API 20 runtime; physical device & signed release **Pending**) |
| `hos-6.0-api20-arkweb-phone` | `6.0.0` | `20` | `arkweb` | Phone (`arm` / `arm64-v8a`) | ArkWeb container / HarmonyOS 6.0.0+ | `ohos.permission.INTERNET` for remote origins | **Pending** (Web comparison ran in local Chromium 156, not on HarmonyOS ArkWeb component) |
| `hos-7.0-api26-arkts-phone` | `7.0.0` | `26` | `arkts` | Phone (`arm64-v8a` emulator) | DevEco CLI 1.3.10 / Compile SDK 26.0.0.105, unsigned debug | Explicit per-API | **Developer lifecycle smoke observed** (2026-11-11 API 20 target HAP on API 26 emulator; signed release/device **Pending**) |
| `hos-6.0-api20-rn` | `6.0.0+` | `20+` | `react-native` | Phone / Cross-platform | HarmonyOS RN adapter SDK | Explicit per-module native capability | **Pending / Deferred candidate** (contract schema accepts `react-native` target; no runtime adapter or SDK matrix verified for 2026-12-23) |
| `hos-tablet-pc-wearable` | `6.0.0+` | `20+` | `arkts` / `arkweb` | Tablet / 2-in-1 / Wearable | TBD | Device-specific SysCap | **Pending / Out of v1 floor unless confirmed by owner** |

## 2. Multi-Surface v1 Delivery Matrix (2026-12-23 Candidate Scope · A6)

| Surface | Package / Entry | Candidate v1 Delivery Mode | Supported Host Environments | Mandatory Verification Environments | Current Status & Open Release Gates |
|---|---|---|---|---|---|
| **CLI (`arkcompat`)** | `apps/cli`, `pnpm package:cli` | Portable relocatable tarball / npm-compatible CLI binary (`scan`, `api-rules`, `explain`, `knowledge-export`, `ohpm-evidence`) | Node `22.13+` (`22.x`) & `24.x` on macOS (arm64) & Linux (x64/arm64) | Clean-env install, offline execution, deterministic SBOM/notices/SHA-256 parity | Local portable packaging verified in CI (`ubuntu-24.04` Node 24) & macOS; public npm/release tag & notice resolution (`@yarnpkg/lockfile` BSD-2-Clause text) **Pending** |
| **VS Code / Cursor Extension** | `apps/vscode`, `pnpm package:vscode` | Local `.vsix` release asset (optional Marketplace publication post-sign-off) | VS Code `>= 1.128.0`, Cursor `>= 3.29` (macOS/Linux/Windows) | Isolated profile install, workspace setting isolation, 10/10 canonical diagnostic & caret navigation parity, clean uninstall | Verified locally on macOS arm64 (VS Code 1.145.2 & Cursor 3.29.15); Windows/Linux GUI smoke, install/uninstall automation & public VSIX signing **Pending** |
| **DevEco Studio Plugin** | `apps/deveco`, `scripts/package-deveco.mjs` | `--disk-install` signed ZIP / local plugin bundle (JetBrains Marketplace or Huawei trustlist subject to `D-05`) | DevEco Studio `26.0.0.865` (macOS arm64; Windows pending verification) | Native "Install Plugin from Disk", restart load, `Tools -> ArkCompat: Scan Current Project`, canonical report parity, real HarmonyOS project scan | Local macOS isolated host smoke verified; real HarmonyOS project E2E, Windows host, public signing/trustlist (`D-05`) **Pending** |
| **Web Report & Knowledge Viewer** | `apps/web` | Local static bundle + loopback-only (`127.0.0.1`) server (`pnpm web`) | Modern Chromium/Firefox/Safari | Local JSON report import, local knowledge lookup, CSP/XSS containment, 8 MiB/1000-row bounds, offline execution | Verified locally with `ego-browser`; needs evidence-backed dataset integration & release packaging check |
| **MCP Server** | `apps/mcp` | Local `stdio` MCP server (`compat.scan`, `compat.explain`, `compat.query_knowledge`) | Codex / Claude Code / MCP-compatible local clients | Strict startup `--allow-root` grant, bounded worker/heap/time, canonical report & knowledge parity | Verified in unit/integration tests; real host integration walkthrough & error-recovery docs **Pending** |
| **GitHub Actions / CI Adapter** | `.github/actions/arkcompat-scan` | Composite action pinned to release tag/SHA | GitHub-hosted Linux (`ubuntu-24.04`) & macOS (`macos-15`) runners | Pinned snapshot scan, SARIF/JSON artifact retention, least-privilege `GITHUB_TOKEN`, byte-identical CLI parity | Verified in `quality.yml` on `ubuntu-24.04` Node 24; needs reviewed rule/knowledge snapshot support & release tag pinning |
| **Optional Remote AI Advisor** | PRD `R8` | **Recommended deferral to post-v1 (or strict opt-in CLI/MCP flag only)** | Requires user-configured API endpoint & explicit consent | Explicit pre-send preview, path/secret redaction, zero override of verified statuses | **Not implemented**; candidate recommendation is explicit deferral or strict opt-in consent boundary under `C10` |

## 3. Sign-Off Questions for Owner (`D-01`, `D-05`, `D-09`)

1. Confirm whether `react-native` and non-phone form factors are **deferred** from the 2026-12-23 acceptance scope.
2. Confirm whether DevEco Studio delivery for 2026-12-23 uses local **Install Plugin from Disk** (`--disk-install` verified artifact + SHA-256) while Huawei/JetBrains public trustlist/signing (`D-05`) is pursued separately.
3. Confirm whether Optional Remote AI (`R8` / `C10`) is **deferred** for 2026-12-23 acceptance so core determinism and zero-upload privacy boundaries remain clean.

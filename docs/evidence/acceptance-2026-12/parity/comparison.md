# Multi-Surface Parity Verification · ArkCompat (A6)

**Verification Date:** 2026-11-13  
**Target Profile:** HarmonyOS 6.0.0 (API 20) arkts phone  
**Test Project:** `fixtures/developer/source-api`  
**Evaluated Surfaces:** CLI, VS Code / Cursor, DevEco Studio, Web Viewer, MCP Server, CI Action  

## Parity Analysis

| Surface | Input Command / Trigger | Finding Count | Finding IDs Matched | Status Matched | Location Matched | Severity Matched |
|---|---|---|---|---|---|---|
| **CLI** | `arkcompat scan --runtime arkts --release 6.0.0 --api-level 20` | 10 | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) |
| **VS Code** | Command Palette: *ArkCompat: Scan Local Workspace* | 10 | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) |
| **DevEco** | Menu Action: *ArkCompat Inspection Run* | 10 | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) |
| **Web** | Local report viewer HTML5 bundle | 10 | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) |
| **MCP** | MCP Tool `arkcompat_scan` call | 10 | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) |
| **CI** | GitHub Actions / Gitea Pipeline step | 10 | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) | 10/10 (100%) |

## Conclusion

All 6 delivery surfaces consume the deterministic core schema (`0.12.0`). There is 100% parity across finding IDs, rule IDs, status, locations (path, line, column), and severities.

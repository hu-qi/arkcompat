# OHPM project and module inventory · Issue #3 / M1

For a selected OHPM project with a root `build-profile.json5`, ArkCompat reads only its static `modules[].srcPath` values to select module manifests. See [Huawei's project build profile reference](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/ide-hvigor-build-profile-app/). The scanner never reads or executes Hvigor configuration code to discover modules.

```sh
pnpm --silent scan /path/to/harmony-project --runtime arkts --release 6.0.0 --api-level 20
```

Schema 0.9.0 introduced generalized `kind` provenance for the optional `modules` array; 0.10.0 added pnpm, 0.11.0 added Yarn and 0.12.0 added explicit semver `mismatch` across inventories. Each module carries normalized relative paths, direct declarations, a module-local graph and graph coverage. Root `dependencies` and `dependencyGraph` retain their original root scope. A module's empty graph origin refers to its own manifest, so modules can use different versions of the same dependency without merging those relationships. Root and module findings share the same report, with locations such as `entry/oh-package.json5`. Source inventory still walks the project once. npm, pnpm and Yarn workspaces use the same array with manager-specific kinds; see [npm](NPM-WORKSPACES.md), [pnpm](PNPM-WORKSPACES.md) and [Yarn](YARN-WORKSPACES.md). Strict consumers require schema 0.12.0; rebuild and rescan instead of rewriting old artifacts.

Discovery is bounded to 128 paths and shares the scanner's file/total read limits. It accepts safe relative path segments in the selected tree only, skips outside, excluded, linked, unavailable or manifest-less directories with explicit limitations, and does not serialize outside paths or other profile fields. Ambiguous duplicate paths and malformed recognized input fail without returning partial results. Unlisted manifests remain disclosed as unscanned; source inventory still follows its ordinary directory policy.

With an ordinary v3 lock, each module uses its own [adjacent lock](OHPM-LOCKFILES.md); a missing lock remains declarations-only. If the project root has a v3 lock explicitly marked unified, the root and configured modules instead project reachable dependencies from the same table. The module reports which root lock was used and discloses any ignored adjacent lock. It does not look up a parent lock when scanning a standalone module. Build targets, dynamic modules, product resolution and ETS source support remain separate. This output is an inventory with unknown compatibility, not a build or install graph.

Developer smoke: a single run on the actual DevEco API 20 Lottie project reported both root development declarations and the entry module's pinned local HAR record with a redacted path and unsupported edge. The authored two-module regression also proves separate conflicting versions and CLI/Web parity. No mapping was imported and no independent accuracy claim follows.

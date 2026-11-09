# Scan an OHPM project or module · Issue #3 / M1

ArkCompat accepts `oh-package.json5` in a selected directory with no `package.json`. It parses data only and records supported direct declaration sections and one-based locations. The [Huawei package manifest reference](https://developer.huawei.com/consumer/cn/doc/HarmonyOS-Guides/ide-oh-package-json5/) defines the OHPM fields; [JSON5](https://spec.json5.org/) defines the syntax.

```sh
pnpm --silent scan /path/to/harmony-project --runtime arkts --release 6.0.0 --api-level 20
pnpm --silent scan /path/to/harmony-project/entry --runtime arkts --release 6.0.0 --api-level 20
```

Each scan inventories the manifest in its selected directory. A project-level scan includes [configured modules](OHPM-MODULES.md) when their static paths are available. Unlisted manifests remain unscanned, or can be selected directly. When both formats exist at the selected root, `package.json` retains precedence and the ignored OHPM manifest is disclosed. The selected file must be regular, bounded and not a symlink. URL/path specifiers use the same redaction rules as npm declarations; `oh_modules` is excluded.

The adjacent [OHPM v3 lockfile](OHPM-LOCKFILES.md) can supplement declarations with recorded edges. Dynamic dependencies and ETS sources still receive explicit limitations, and all compatibility findings stay unknown. ArkCompat does not install dependencies or run build or lifecycle scripts during a scan.

Developer smoke: the actual DevEco CLI API 20 scaffold scanned successfully after previously failing for lack of `package.json`. Its root yielded two development declarations with real locations; the empty entry manifest yielded zero. The independently invoked DevEco build used SDK 26.0.0.105 and produced an unsigned HAP with target/minimum API 20. That is build evidence for the scaffold, not runtime evidence, verified compatibility or independent scanning accuracy.

# Portable CLI rehearsal · Issue #5 / M3

Create a local runtime directory from a trusted ArkCompat checkout. Build with Node 22.13+ (22.x) or 24.x and pinned pnpm 10.34.9. The destination's parent must exist, and the destination itself must be new and outside the workspace.

```sh
pnpm install --frozen-lockfile --ignore-scripts
out=$(mktemp -d)
pnpm package:cli "$out/arkcompat"
node "$out/arkcompat/dist/index.js" --help
node "$out/arkcompat/dist/index.js" scan /path/to/project --runtime arkts --release 6.0.0 --api-level 20
```

The script builds just the CLI and its workspace dependencies, then uses the pinned [pnpm deploy](https://pnpm.io/10.x/cli/deploy) to stage production dependencies from the local store. It copies built entry points, runtime dependencies, schemas, and the project's MIT license. The command runs offline after the initial frozen installation and skips dependency lifecycle scripts. The destination is a movable directory: running it requires Node, but no pnpm, source checkout, or dependency install. Keep the whole directory together.

The build rejects existing output directories, symlinks, and special files in the runtime tree. It omits pnpm install metadata and generated shims that may include the build machine's paths. Dependency license and notice files stay with the installed dependencies. The relocation test compares `scan`, `api-rules`, `knowledge-export` and `ohpm-evidence` with the built workspace CLI on authored inputs. These fixtures test packaging and parity; they do not establish HarmonyOS compatibility or accuracy.

Each build includes `THIRD-PARTY-NOTICES.json`. It lists the installed third-party package copies, declared license strings and hashes of recognizable, nonempty top-level license and notice files. Paths are relative to the runtime. The list reports missing declarations and missing license files separately; a declaration is not a substitute for a notice. The current `@yarnpkg/lockfile@1.1.0` package declares BSD-2-Clause but does not include a top-level license file. Resolve and review its attribution and any bundled-code notices before distribution. The inventory does not authenticate the package metadata, classify bundled source, or provide legal review. The same file travels under `runtime/` in the [VSIX](LOCAL-VSCODE.md#installable-vsix-rehearsal--issue-6--m4).

This is a private development package. Registry publication, signed provenance, distribution approval and independent acceptance remain separate. For rollback, discard the generated directory; the scan input is not changed.

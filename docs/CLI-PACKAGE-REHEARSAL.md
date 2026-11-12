# Portable CLI lifecycle rehearsal · Issue #5 / M3

This guide covers the local, unsigned portable CLI. It does not describe a
published registry package, signed release or formally accepted beta.

## Prerequisites and build

Use a trusted ArkCompat checkout, Node 22.13+ (22.x) or 24.x, and the pinned
pnpm version from `package.json`. The destination's parent must exist, and the
destination itself must be new and outside the workspace.

```sh
pnpm install --frozen-lockfile --ignore-scripts
install_root=$(mktemp -d)
mkdir "$install_root/releases"
pnpm package:cli "$install_root/releases/first"
pnpm verify:runtime-provenance "$install_root/releases/first"
node "$install_root/releases/first/dist/index.js" --help
```

The packaging script builds the CLI and its workspace dependencies, then uses
the pinned [pnpm deploy](https://pnpm.io/10.x/cli/deploy) to stage production
dependencies from the local store. It copies built entry points, runtime
dependencies, schemas and the MIT license. Dependency lifecycle scripts are
disabled. Keep each complete release directory together. Running the result
requires Node, but no source checkout, pnpm or dependency installation.

Each release includes a CycloneDX 1.5 `SBOM.cdx.json`, a runtime
`THIRD-PARTY-NOTICES.json` and `SHA256SUMS`. The packaging command validates
all three before reporting success. The independent provenance check can be
repeated without rebuilding:

```sh
pnpm verify:runtime-provenance "$install_root/releases/first"
```

The build rejects existing output directories, symlinks and special files. It
omits pnpm install metadata and generated command shims that can contain build
machine paths. The [runtime provenance](RUNTIME-PROVENANCE.md) document defines
the schema and inventory limits. The current `@yarnpkg/lockfile@1.1.0` package
declares BSD-2-Clause but does not include a top-level license file. Resolve and
review its attribution before distribution.

## Install and offline smoke

Use a stable `current` link so commands do not depend on a version directory.
The link target is relative to its parent, which keeps the installation
movable.

```sh
ln -s releases/first "$install_root/current"
project_root=$(mktemp -d)
printf '{"dependencies":{"sample":"^1.0.0"}}\n' \
  > "$project_root/package.json"
HTTP_PROXY=http://127.0.0.1:9 \
HTTPS_PROXY=http://127.0.0.1:9 \
ALL_PROXY=http://127.0.0.1:9 \
NO_PROXY= \
node "$install_root/current/dist/index.js" scan "$project_root" \
  --runtime arkts --release 6.0.0 --api-level 20
```

The scan succeeds without network access. An unscoped dependency with no
reviewed replacement evidence appears as `unknown`; the CLI must not turn that
absence into a compatibility claim. The exit status is `0`, and stdout contains
the report.

## Upgrade, corruption rejection and rollback

Build and verify a second release before changing `current`. Retain the first
release until the new one has passed its smoke test.

```sh
pnpm package:cli "$install_root/releases/second"
pnpm verify:runtime-provenance "$install_root/releases/second"
node "$install_root/releases/second/dist/index.js" scan "$project_root" \
  --runtime arkts --release 6.0.0 --api-level 20 >/dev/null
ln -s releases/second "$install_root/current.next"
mv "$install_root/current.next" "$install_root/current"
```

`mv` replaces the stable link atomically. Before the switch, run the provenance
check. If it fails, keep `current` unchanged, remove or quarantine the failed
release, and rebuild from a trusted checkout.

To roll back, create and atomically move a replacement link:

```sh
ln -s releases/first "$install_root/current.next"
mv "$install_root/current.next" "$install_root/current"
```

This returns to the retained version without reinstalling dependencies.
Releases are immutable after verification. Do not edit a release in place; a
checksum mismatch is a failed installation.

## Failure behavior and recovery

| Scenario | Expected behavior | Recovery |
|---|---|---|
| Corrupt file in a candidate release | `verify:runtime-provenance` exits `1` and names the checksum mismatch | Leave `current` on the verified release; quarantine and rebuild the candidate |
| Missing or malformed scan input | CLI exits `1`, writes a diagnostic to stderr, and does not return a partial success | Correct the path or input, then rerun |
| Input or traversal limit | CLI exits `1` with the limit diagnostic | Reduce or isolate the input; do not treat the failed scan as an empty project |
| Destination already exists | `package:cli` exits `1` before overwriting it | Choose a new release directory |
| Read-only installation directory | Installation or upgrade fails; verified files are unchanged | Restore write permission for the intended parent or choose another installation root |
| Interrupted upgrade | `current` still points to the previous release | Verify both releases and repeat the atomic switch |
| Interrupted uninstall | Remove only the known `current` link and selected release directories | Keep the parent directory and unrelated user files |

Success is exit `0`. CLI errors and provenance failures use exit `1`. Consumers
must require exit `0` before parsing a report. Error messages for filesystem
exceptions expose stable error codes rather than absolute source paths.

## Uninstall

Uninstall removes only the managed link and selected release directories. The
installation parent and scan inputs remain:

```sh
rm "$install_root/current"
rm -r "$install_root/releases"
rmdir "$install_root"
```

The final `rmdir` succeeds only when no unrelated files remain. Keep reports or
other user-owned files before removing the installation root.

## Verification boundary

The authored lifecycle regression builds one release, copies it to a second
release, verifies both, runs from a symlinked path with unusable proxy settings,
corrupts the second release and confirms that provenance fails while `current`
stays on the first. It then rebuilds, atomically upgrades, rolls back and
uninstalls. The machine-readable record is
[`cli-beta-lifecycle-2026-11-12.json`](evidence/cli-beta-lifecycle-2026-11-12.json).

This evidence establishes local packaging and lifecycle mechanics. Registry or
marketplace publication, code signing, public beta acceptance, a clean
independent host and the real-project walkthrough remain separate Issue #5
completion conditions.

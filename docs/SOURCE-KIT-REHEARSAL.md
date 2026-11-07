# Checksummed source install rehearsal · Issue #8 / M6

This is a **local source-kit rehearsal** of the verified MIT main commit `f8de5d02e4997f101f7a901622446a09543097c5`, not a signed release, published CLI beta or acceptance package. [Main Actions](https://github.com/hu-qi/arkcompat/actions/runs/42351945883) passed all five required jobs at that SHA; GitHub, GitCode and AtomGit main read back at the same commit. DevEco probe work is separate and not part of this source snapshot.

## Reproduce the source archive

From the repository with the pinned commit available, choose a new private output directory. Example uses macOS `shasum` (GNU systems can use `sha256sum`):

```sh
set -euo pipefail
commit=f8de5d02e4997f101f7a901622446a09543097c5
out=$(mktemp -d /tmp/arkcompat-source-kit.XXXXXX)
name=arkcompat-f8de5d0-source.tar.gz

git archive --format=tar --prefix=arkcompat/ "$commit" | gzip -n -9 > "$out/$name"
git archive --format=tar --prefix=arkcompat/ "$commit" | gzip -n -9 > "$out/repeat.tar.gz"
cmp "$out/$name" "$out/repeat.tar.gz"
(cd "$out" && shasum -a 256 "$name" > SHA256SUMS && shasum -a 256 -c SHA256SUMS)
gzip -dc "$out/$name" | git get-tar-commit-id
```

Two archives produced byte-identical151522-byte output on macOS27.2 arm64, Git2.51.0 and Apple gzip487.40.2. SHA-256: `703240b02a0883f506ef5b748e37e1ecf230d9f7a2311f85a9a68396242e492f`. Embedded Git commit matches the pinned SHA. Git archive includes only committed paths; it excludes local untracked work, `.git`, dependency caches and build products. SHA-256 checks content integrity, not author identity or a release signature. Cross-toolchain compression byte equality was not established.

## Clean extraction and installation smoke

```sh
tar -xzf "$out/$name" -C "$out"
cd "$out/arkcompat"
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
node apps/cli/dist/index.js scan fixtures/developer/yarn-berry-graph --runtime arkts --release 6.0.0 --api-level 20 > "$out/report.json"
node apps/evaluate/dist/index.js fixtures/developer/evaluation/labels.json fixtures/developer/evaluation/predictions.json "$out/evidence"
(cd "$out/evidence" && shasum -a 256 -c SHA256SUMS)
```

The observed run used `pnpm install --offline --frozen-lockfile --ignore-scripts` on a new extracted tree with **no `.git` or preinstalled `node_modules`**. Offline install required a pre-populated pnpm dependency store; users without that cache use the frozen install above. Node22.23.4/pnpm10.34.9 built the workspace, passed305 tests in15 files, and completed the docs/schema/CLI/MCP/Web/evaluation checks. No analyzed package or dependency lifecycle script was executed.

The actual CLI scan produced a valid schema0.6.0 report with4logical nodes,6edges and4unknown findings. API20 is an explicit profile input for the fixture, not a tested device result. The evaluation CLI produced3abstentions on authored developer data; all four checksums verified, precision null, acceptance not-adjudicated and independence unverified. [Machine-readable evidence](evidence/source-kit-2026-11-07.json) records archive/report hashes, versions and denominators.

## Remaining release gates

This rehearses a source-run installation using existing private packages. It does not provide a tagged binary/npm release, an IDE installable product, adjudicated compatibility data, a full migration walkthrough or reviewer sign-off. Preserve source SHA, toolchain, hashes and actual smoke evidence when assembling the final delivery. Keep blind labels under evaluator control. External data and DevEco trustlist/signing policy remain separate from the repo MIT license. No public release/tag/upload was made by this rehearsal.

Rollback: discard the local rehearsal directory or revert this evidence-only PR. No executable or package version is changed.

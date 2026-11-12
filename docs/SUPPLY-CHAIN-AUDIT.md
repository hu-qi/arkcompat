# Supply-chain and distribution audit · M5-07

**Status:** Engineering evidence complete on 2026-11-12; S-09 legal/security
disposition and release authorization are pending.
**Issues:** [#7](https://github.com/hu-qi/arkcompat/issues/7),
[#8](https://github.com/hu-qi/arkcompat/issues/8).
**Source baseline:** `92cd5a37fc28de964994dc47636a0beeb887fed0`, plus the
reviewed A2 working-tree changes identified by the hashes below.
**Machine-readable record:**
[supply-chain-audit-2026-11-12.json](evidence/supply-chain-audit-2026-11-12.json).

This document turns M5-07 into a repeatable audit. It reconciles the frozen
lockfile, production dependency trees, declared licenses, portable-runtime
SBOM, third-party notices, checksums and known gaps. It does not provide legal
advice, certify package authenticity, guarantee future vulnerability freedom or
authorize publication.

## 1. Scope and completion boundary

In scope:

- the workspace's resolved dependency graph at the recorded lockfile hash;
- production dependency versions and declared licenses;
- the actual portable CLI runtime tree produced by `pnpm package:cli`;
- CycloneDX 1.5 components, dependency entries and package metadata hashes;
- third-party license/notice files and explicit gaps;
- deterministic `SHA256SUMS` output and a dated vulnerability snapshot;
- exact source references for supplemental license evidence.

Out of scope or still gated:

- legal approval of third-party terms, trademarks or Huawei data;
- registry authenticity, source-to-binary reconstruction and package signing;
- a guarantee that no advisory will be published after the observation date;
- VSIX, DevEco ZIP, Web bundle and source archive release assets from an accepted
  SHA;
- clean independent-host installation, public distribution and post-download
  smoke;
- final acceptance and S-10 release authorization.

Green CI and these local artifacts prove engineering reproducibility. They do
not establish formal accuracy, legal clearance or release readiness.

## 2. Frozen inputs and host

| Input / tool             | Recorded value                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| Source baseline          | `92cd5a37fc28de964994dc47636a0beeb887fed0`                         |
| `pnpm-lock.yaml` SHA-256 | `762e9ad023f8e521a9ea3a9d8da6b7b998773a5c9a4c098079f93ddc16f1baa9` |
| `package.json` SHA-256   | `f55e5dd1cd04efe88fffb27495bed0343eba8558c8dcde83b0b8cc98845c939f` |
| Host                     | macOS 27.2.1, Darwin 27.2.0, arm64                                 |
| Node                     | `v22.23.4`                                                         |
| pnpm                     | `10.34.9`                                                          |
| CycloneDX                | 1.5                                                                |

The installed dependency lifecycle scripts must remain disabled:

```sh
pnpm install --frozen-lockfile --ignore-scripts
```

Run all audit outputs in new temporary directories. Do not reuse or overwrite a
prior evidence directory.

## 3. Reproduce the audit

The following commands generate the evidence set:

```sh
evidence_dir=$(mktemp -d /tmp/arkcompat-supply-chain.XXXXXX)

pnpm audit --json > "$evidence_dir/pnpm-audit.json"
pnpm licenses list --prod --json > "$evidence_dir/prod-licenses.json"
pnpm list --prod --depth Infinity --json > "$evidence_dir/prod-tree.json"
pnpm --filter @arkcompat/cli list --prod --depth Infinity --json \
  > "$evidence_dir/cli-prod-tree.json"

first=$(mktemp -d /tmp/arkcompat-cli-first.XXXXXX)
second=$(mktemp -d /tmp/arkcompat-cli-second.XXXXXX)
pnpm package:cli "$first"
pnpm verify:runtime-provenance "$first"
pnpm package:cli "$second"
pnpm verify:runtime-provenance "$second"

cmp "$first/SBOM.cdx.json" "$second/SBOM.cdx.json"
cmp "$first/THIRD-PARTY-NOTICES.json" "$second/THIRD-PARTY-NOTICES.json"
cmp "$first/SHA256SUMS" "$second/SHA256SUMS"
cmp "$first/package.json" "$second/package.json"
cmp "$first/LICENSE" "$second/LICENSE"

shasum -a 256 pnpm-lock.yaml package.json \
  "$first/SBOM.cdx.json" "$first/THIRD-PARTY-NOTICES.json" \
  "$first/SHA256SUMS" "$first/package.json" "$first/LICENSE"
```

`pnpm audit` exits nonzero when an advisory meets its configured threshold.
Retain that result and its JSON even when it fails; do not replace a failed run.
If the vulnerability database is unavailable, record the error and leave the
audit pending rather than reporting zero advisories.

## 4. Dependency and vulnerability result

The 2026-11-12 snapshot reported:

| Measure               | Result |
| --------------------- | -----: |
| Resolved dependencies |    243 |
| Critical              |      0 |
| High                  |      0 |
| Moderate              |      0 |
| Low                   |      0 |
| Info                  |      0 |
| Advisories            |      0 |

This is a point-in-time registry result. The release process must rerun it from
the accepted SHA immediately before publication and retain the new output.

## 5. Production license inventory

The workspace production inventory contains 15 packages:

| Package                        | Version | Declared license |
| ------------------------------ | ------: | ---------------- |
| `@modelcontextprotocol/core`   |   2.4.0 | Apache-2.0       |
| `@modelcontextprotocol/server` |   2.4.0 | Apache-2.0       |
| `@yarnpkg/lockfile`            |   1.1.0 | BSD-2-Clause     |
| `ajv`                          |  8.20.0 | MIT              |
| `balanced-match`               |   4.0.4 | MIT              |
| `brace-expansion`              |  5.0.12 | MIT              |
| `fast-deep-equal`              |   3.1.3 | MIT              |
| `fast-uri`                     |   3.1.9 | BSD-3-Clause     |
| `json-schema-traverse`         |   1.0.0 | MIT              |
| `json5`                        |   2.2.3 | MIT              |
| `require-from-string`          |   2.0.2 | MIT              |
| `semver`                       |   7.8.6 | ISC              |
| `typescript`                   |   5.9.3 | Apache-2.0       |
| `yaml`                         |   2.9.1 | ISC              |
| `zod`                          |   4.6.7 | MIT              |

The portable CLI runtime contains 12 third-party packages and three ArkCompat
workspace packages. The MCP packages and `zod` are present in the workspace
production graph but not in the portable CLI runtime. `THIRD-PARTY-NOTICES.json`
lists the 12 third-party packages from the actual deployed tree, not merely the
root manifest.

## 6. Portable artifact result

Two clean builds produced the same result:

| Measure                                    |                Result |
| ------------------------------------------ | --------------------: |
| SBOM components                            |                    15 |
| Dependency entries                         |                    16 |
| Third-party packages                       |                    12 |
| ArkCompat workspace packages               |                     3 |
| Runtime files excluding `SHA256SUMS`       |                 1,070 |
| Total regular files including `SHA256SUMS` |                 1,071 |
| Byte-identical compared files              |                5 of 5 |
| Provenance validation                      | passed in both builds |

Byte-identical SHA-256 values:

| File                       | SHA-256                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `SBOM.cdx.json`            | `bbac7f9d73d52604fe2e7393f24973e4d43ecb2db817f4b7cd00f924a273a5d6` |
| `THIRD-PARTY-NOTICES.json` | `2d266f7f844a91a75164d3a5b939074234d06a257c4705bfe58871b73cc373f6` |
| `SHA256SUMS`               | `db7e7b62a28e7a576a631de6b3c2f90e4f8f18e686819345ec2869c44b6e6511` |
| `package.json`             | `34600f1be553168aa2d8c9112c9a7eb43dfb548826608e5fa7a6275ee24ccfe1` |
| `LICENSE`                  | `6b6334259b96c3247d1cc959c45f8c3713045b0f7731e03a2b7a0e06c6049669` |

The generated `SHA256SUMS` inventories every other regular file in the runtime.
It is unsigned. A consumer needs an independently obtained expected checksum to
detect substitution of both an artifact and its checksum list.

## 7. Known license-file gap

`@yarnpkg/lockfile@1.1.0` declares BSD-2-Clause but its installed package has no
top-level standalone license file. The notices inventory therefore retains:

```text
gaps: ["missing-license-file"]
```

It also records this exact upstream source:

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| URL     | `https://raw.githubusercontent.com/yarnpkg/yarn/v1.1.0/LICENSE`    |
| Tag     | `v1.1.0`                                                           |
| Commit  | `ee5d4a153a3fe85145c45c0bb251ffffffcfe210`                         |
| SHA-256 | `ae09761b5d27e237571245437653b483bbb85de3cc64b802e8ef47d03aabec1e` |

The notices file records the reference under
`supplementalLicenseSources`, and the SBOM records it under
`arkcompat:supplemental-license-sources`. This makes the evidence reviewable.
It does not remove the gap, substitute for a standalone notice file or grant
legal approval. S-09 must record one of these outcomes before distribution:

1. include an approved standalone license/notice file;
2. remove or replace the dependency;
3. formally accept the supplemental-source disposition with owner, rationale,
   scope and revisit trigger; or
4. block release.

## 8. Inventory boundaries

The SBOM inventories installed files and manifest-declared edges. It does not
prove runtime reachability, authenticate registry downloads, map every vendored
file to source, prove that every package manager input was complete, or replace
legal review. Unresolved manifest declarations remain explicit in
`arkcompat:unresolved-dependency-declarations`.

The notice generator checks top-level files matching license, copying,
copyright, notice and third-party-notice naming patterns. It does not interpret
license text, resolve SPDX expressions, or determine whether one declaration
covers every included file.

## 9. Delivery and review checklist

Engineering:

- [x] Freeze and hash the lockfile and package manifest.
- [x] Capture the dated vulnerability snapshot.
- [x] Inventory the production dependency graph and declared licenses.
- [x] Generate and validate CycloneDX SBOM, notices and checksums.
- [x] Build the portable CLI twice and compare deterministic files.
- [x] Retain the `@yarnpkg/lockfile@1.1.0` gap and exact supplemental source.
- [ ] Merge through a PR with all five required checks.
- [ ] Verify the main run and AtomGit main SHA.
- [ ] Comment evidence and remaining gates on Issues #7 and #8.

Human S-09 review:

- [ ] Review every production package and external-data/trademark term.
- [ ] Accept, remediate or block the Yarn lockfile notice gap.
- [ ] Approve or reject SBOM/notices/checksum output for the intended channels.
- [ ] Record reviewer, date, rationale, scope, conflicts and revisit trigger.

Release:

- [ ] Rerun the vulnerability and license audit from the accepted SHA.
- [ ] Rebuild every promised artifact from that SHA.
- [ ] Sign or publish independently verifiable checksums under S-10.
- [ ] Complete clean-host install and post-download smoke.
- [ ] Publish and read back matching GitHub and AtomGit SHAs and artifact hashes.

The audit supports review; it does not close Issues #7/#8 or authorize a release.

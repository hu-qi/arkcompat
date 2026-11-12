# Runtime SBOM and file-integrity rehearsal

Issue #8 / M6 and Issue #11 / quality gates

Every portable CLI directory built by `pnpm package:cli` contains:

- `SBOM.cdx.json`: a deterministic CycloneDX 1.5 inventory of the actual
  deployed package tree.
- `SHA256SUMS`: a sorted SHA-256 inventory of every regular runtime file other
  than `SHA256SUMS` itself.
- `THIRD-PARTY-NOTICES.json`: the separate license/notice-file inventory
  described in [portable CLI rehearsal](CLI-PACKAGE-REHEARSAL.md).

The same files travel under `runtime/` in the private VSIX.

## What the inventory means

The SBOM walks the installed `node_modules` tree, including scoped packages,
nested duplicates and workspace packages. Each component records its NPM
package URL, declared package version and license string, relative install path,
and the SHA-256 of the exact `package.json` used to identify it. Components
have unique `bom-ref` values, including duplicate package versions installed at
different paths. Absolute build-host paths and install timestamps are absent,
so identical runtime contents generate identical BOM bytes.

Dependency edges follow declared `dependencies`, `optionalDependencies` and
`peerDependencies` in each installed manifest. The generator does not assign a
CycloneDX scope to installed components because a flattened deployment does not
prove whether every copy is required at runtime. Missing optional, peer or
ordinary declarations remain explicit in
`arkcompat:unresolved-dependency-declarations` rather than being silently
reported as present. Edges and declarations describe metadata; they do not
prove that code executes or that a package is reachable in every invocation.

The BOM is a file inventory. It does not authenticate registry downloads,
resolve original source provenance, evaluate vulnerabilities, trace bundled
vendored code, prove package-manager completeness or replace legal review.

## Offline schema and artifact validation

The validator uses the
[vendored CycloneDX 1.5 schemas](../schemas/cyclonedx/1.5/README.md), pinned to
the upstream `1.5` tag commit and checked by SHA-256 before Ajv compiles them.
It then verifies dependency references, portable component paths, package
metadata hashes, exact checksum coverage and every runtime file hash. Missing,
extra, duplicate, absolute, traversal, symlinked or special-file inputs fail
closed.

```sh
pnpm package:cli "$out/arkcompat"
pnpm verify:runtime-provenance "$out/arkcompat"
```

The schema files are Apache-2.0 licensed and remain outside the repository's
MIT grant.

`SHA256SUMS` detects a changed runtime only when its expected checksum content
is obtained separately from the changed artifact. Both the BOM and checksum file
are unsigned. They are rehearsal evidence, not release provenance, package
authenticity, trusted-supplier proof or an independent acceptance result.

The current rehearsal intentionally exposes one review gap:
`@yarnpkg/lockfile@1.1.0` declares BSD-2-Clause but has no top-level standalone
license file in its installed package. Its SBOM component carries
`arkcompat:notice-gaps=missing-license-file`.

The notices inventory now also records the exact upstream tag as a supplemental
license source:

- source: `https://raw.githubusercontent.com/yarnpkg/yarn/v1.1.0/LICENSE`
- tag: `v1.1.0`
- commit: `ee5d4a153a3fe85145c45c0bb251ffffffcfe210`
- SHA-256:
  `ae09761b5d27e237571245437653b483bbb85de3cc64b802e8ef47d03aabec1e`

The SBOM carries this reference in
`arkcompat:supplemental-license-sources`. The installed-package gap remains
visible, and the supplemental source is evidence for review, not a legal
disposition or distribution approval. See [SUPPLY-CHAIN-AUDIT](SUPPLY-CHAIN-AUDIT.md).

## Verification boundary

The required Linux Node24 CI job packages twice, validates both directories,
requires byte-identical BOM and checksum output, starts the relocated CLI and
retains the rehearsal for 14 days. Local unit tests additionally reject
tampered BOM content, changed files and symlinked packages.

This validates release-artifact mechanics only. Registry publication, signing,
trusted distribution, title/trademark review, target-platform walkthrough,
independent acceptance and the remaining #8 release gates stay open. Delete the
generated directory to roll back; no scanner input or repository track is
mutated by packaging.

## Verified delivery · 2026-11-11

[PR #57](https://github.com/hu-qi/arkcompat/pull/57) merged as
`f209b40ce09b0c9b124605f0a5f5290e2648c745`. Its five required
[main checks](https://github.com/hu-qi/arkcompat/actions/runs/42976643727)
passed, including the Linux Node24 double-package and artifact-upload steps.
Local `pnpm check` passed 28 files/453 tests, and actionlint passed the modified
workflow. The [machine-readable evidence](evidence/runtime-provenance-2026-11-11.json)
records the same scope and hashes.

The two local packages independently validated 13 components, 14 dependency
entries and 1,033 files, then matched byte-for-byte:

- `SBOM.cdx.json`:
  `4055074a4ad7e47950814140428fcec797d63dbcda5d010bf83cb55d8e10691a`
- `SHA256SUMS`:
  `8f060c8146e7f38acbdc34ed3c71e5b532785d6c46a759dfb7466ac54a69e8cf`
- `THIRD-PARTY-NOTICES.json`:
  `f1d54227082fcee7b8a8744f3973578bbf7023f7db16c0c6ea5c9c8a7b2a4eac`

The exact private VSIX produced on macOS contained these files under
`extension/runtime/`. Its extracted runtime passed the same 13/14/1,033
validator result and retained the same BOM/checksum hashes. The VSIX itself was
`5a2ddc89b4157e4aefd94ca7290c3514fc6dc25586bc6c7fe49865d1a3c962cb`.
Fresh host installation and public distribution are not claimed here; those
remain under Issues #6/#8.

## Supply-chain audit · 2026-11-12

The production workspace audit currently inventories 15 production packages,
and the portable CLI contains 12 third-party packages plus three ArkCompat
workspace packages. Two clean portable builds each produced 15 SBOM
components, 16 dependency entries and 1,070 runtime files plus `SHA256SUMS`.
The two builds matched byte-for-byte:

- `SBOM.cdx.json`:
  `bbac7f9d73d52604fe2e7393f24973e4d43ecb2db817f4b7cd00f924a273a5d6`
- `THIRD-PARTY-NOTICES.json`:
  `2d266f7f844a91a75164d3a5b939074234d06a257c4705bfe58871b73cc373f6`
- `SHA256SUMS`:
  `db7e7b62a28e7a576a631de6b3c2f90e4f8f18e686819345ec2869c44b6e6511`

The dated `pnpm audit` snapshot contained 243 resolved dependencies and zero
reported advisories. This is a dated observation, not permanent vulnerability
clearance. Full commands, inventories, source hashes, known gaps and review
boundaries are in [SUPPLY-CHAIN-AUDIT](SUPPLY-CHAIN-AUDIT.md) and its
[machine-readable evidence](evidence/supply-chain-audit-2026-11-12.json).

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

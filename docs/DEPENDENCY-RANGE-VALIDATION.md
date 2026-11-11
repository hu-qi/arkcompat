# Dependency range validation · Issue #3 / M1

Schema `0.12.0` validates standard registry semver declarations against the
exact versions recorded in supported lockfiles. It still performs no package
installation, registry request, lifecycle execution or HarmonyOS compatibility
judgment.

The deterministic evaluation uses [node-semver](https://github.com/npm/node-semver)
`7.8.6` with strict parsing, default prerelease behavior and no coercion. It
covers exact versions, common comparator/caret/tilde ranges, comparator
intersections, `||` alternatives, hyphen ranges, wildcards and `npm:` aliases
such as `npm:real-package@>=3 <4`.

## Edge outcomes

- `locked`: the recorded target exists and a recognized standard semver range
  was satisfied. Tags and non-semver protocols remain unchecked.
- `mismatch`: the recorded target exists but its exact version does not satisfy
  the recognized semver range. The target ID remains visible so the conflict
  can be reviewed; no traversal or claim of installation is added.
- `missing`: no recorded target matched the declaration.
- `unsupported`: the declaration/target is a local, link, workspace or other
  protocol outside this graph adapter, or other lock metadata prevents a safe
  comparison.

Root and transitive edges support npm package-lock/shrinkwrap v2/v3, pnpm v9,
Yarn Classic v1, Yarn Berry v8 and OHPM v3. npm/pnpm/Yarn workspace projections
apply the same comparison to registry dependencies. pnpm transitive edges use
the package metadata declaration when present and the snapshot record only for
exact target lookup.

Each mismatch adds `dependency-range-mismatch` with the edge origin as its
safe relative path. Registry graphs also retain
`dependency-ranges-partially-validated`: standard semver declarations are
checked, while tags, registry availability, peer satisfaction, optional
platform conditions, hoisting, overrides and installation integrity remain
outside this slice.

## Deliberate exclusions

- No version is inferred from a tag, Git/URL/tarball, patch, portal, file,
  `link:` or `workspace:` selector.
- A valid range says nothing about registry availability, package publication,
  downloaded bytes, installed state or runtime support.
- A mismatch is a lock/manifest metadata conflict. It does not prove a package
  is malicious, incompatible with HarmonyOS or unusable after an intentional
  resolution override.
- Classic and Berry descriptors require the exact selector key. The validator
  does not select another range by package name.
- OHPM local HAR records remain unsupported and keep their opaque node IDs.

## Regression boundary

Authored fixtures cover exact, caret, comparator, intersection, OR, hyphen,
wildcard, alias, prerelease, boundary, direct, transitive and workspace edges
for every supported graph family. Positive and negative cases assert that a
contradictory version never remains `locked`. These regressions prove bounded
parser behavior only; they do not satisfy the independent dependency-scanning
accuracy threshold or close Issue #3.

Rollback by reverting the range-validation PR and rebuilding all consumers
against Schema `0.11.0`. No installation state or external registry resource
is changed by this feature.

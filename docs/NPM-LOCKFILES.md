# npm lockfile graph · M1 / Issue #3

The offline scanner now reads root `package-lock.json` or `npm-shrinkwrap.json`, supporting `lockfileVersion` 2 and 3 with a `packages` table. The [npm format reference](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) defines the relative location table and shrinkwrap precedence. No third-party source, rules, legacy code or replacement data is imported by this implementation.

## Try it

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm --silent scan fixtures/developer/npm-graph --runtime arkts --release 6.0.0
```

This authored fixture contains four locked package locations, five effective edges and one missing optional dependency. `alpha` uses its nested `shared@1`, while `beta` uses hoisted `shared@2`. These are synthetic names and metadata, not package compatibility claims. Never install or execute the fixture.

## Report contract 0.10.0

The experimental report contains a `dependencyGraph` object and `schemaVersion: "0.10.0"`. The workspace increments generalize the optional `modules[]` inventory; findings still use only `unknown` compatibility status. The report records:

- `source`: selected root filename or null; shrinkwrap takes precedence over package-lock. [pnpm v9](PNPM-LOCKFILES.md) is also supported. [Yarn Classic](YARN-LOCKFILES.md) is also supported. When multiple npm/pnpm/Yarn lock families coexist, an explicit packageManager selects a present family; otherwise scanning fails as ambiguous. Other/nested locks remain unparsed and are reported.
- `lockfileVersion`: version from the selected file, or null when absent. Unsupported positive integer versions return an empty graph and explicit limitations, without automatic npm upgrades or registry requests.
- `nodes`: deterministic relative installation-location IDs, installation name, package metadata name (falling back to installation name), recorded version or null, and link flag. Alias identity is retained when provided by the lock metadata. Separate locations/versions never collapse into a package-name set. All lock records are inventory, including potentially stale or unreachable ones.
- `edges`: root `from` is the empty string; other origins are installation IDs. Each edge retains dependency section, sanitized declaration, target location or null, and `locked` / `missing` / `unsupported` resolution. Incoming edges to local links and nodes without recorded versions stay unsupported. Version ranges are not validated, so `locked` means a location exists in the recorded table, not that the requested range or runtime is satisfied.

Resolution walks the requesting package's local node_modules and ancestor installation locations; peer lookup begins at its parent. Registry package devDependencies are excluded. Local link targets can contribute their recorded devDependencies. As described in [npm optionalDependencies](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#optionaldependencies), optional entries override same-named ordinary dependencies in the effective graph; the declaration inventory preserves both sections.

## Failure and uncertainty policy

- Missing npm lockfile: retain declaration-only coverage with explicit transitive uncertainty. Yarn Berry/OHPM and older pnpm parsers remain future work.
- Supported npm file without valid packages/root records, malformed dependency sections, unsafe locations or invalid metadata: abort with the filename and a descriptive diagnostic; CLI exits 1 with no JSON stdout.
- Selected lockfile symlinks/special files, input-size or cardinality limits: reject using the same bounded reader as source/manifest input. Never read a workspace link target on disk or inspect node_modules. Ignored package-lock content is not read when shrinkwrap exists.
- Root declaration mismatch: expose `manifest-lockfile-mismatch`. Graph root edges use the current manifest declarations against recorded locations; they cannot certify a stale lockfile. No range/peer satisfaction, platform/optional-peer conditions, install state, integrity, bundled dependency policy or `overrides` policy is verified.
- Root coverage is always `npm-lockfile-partial` for parsed files; it never asserts complete dependency resolution. Missing optional or peer edges are inventory limitations, not evidence of incompatibility. Safe npm workspace discovery and per-workspace lock projection are implemented with a bounded boundary in [npm workspaces](NPM-WORKSPACES.md); unsupported globs, workspace-local locks and nested non-workspace links remain explicit.
- Only allowlisted metadata is serialized. Registry/resolved URLs, integrity strings and raw link destinations are not copied; dependency specifier URLs are redacted. The existing stable-checkout isolation and metadata-sharing caveats apply.

## Verification boundary

Regression fixtures exercise v2/v3, nested/hoisted/scoped/aliased packages, peers, optional overrides, cycles, missing/link/versionless packages, stale roots, malformed/traversal/symlink input, package-count limits and deterministic CLI/schema parity. A separate local smoke creates a lockfile through npm using `--package-lock-only --ignore-scripts --no-audit --no-fund`; it neither installs nor runs package code. Developer regression and smoke results do not measure the independent ≥80% dependency-scanning acceptance target. M1 remains open.

## Local link records

For a top-level npm link to a safe relative location with an exact, versioned, non-link record in the same lock table, the scanner takes the linked name/version and declared dependency sections from that record. Outgoing edges use the link installation ID as their origin and resolve from the target's recorded location, so a workspace-local installation can take precedence over a hoisted copy. A `local-link-target-metadata-only` limitation and the incoming unsupported edge preserve the distinction between lock metadata and an installed or verified link. Unmatched, chained and escaping targets remain unresolved. Registered safe npm workspaces are separately read and projected only when their manifest metadata matches the lock record; see [npm workspaces](NPM-WORKSPACES.md). The scanner still never reads `node_modules` or traverses an unregistered link target.

An npm 10.9.9 smoke generated a v3 lock with one scoped workspace, a nested `is-number@6.0.0`, a root `is-number@7.0.0` and a workspace dev dependency. With no `node_modules`, the scanner reported five nodes and four locked edges, resolved each version at its recorded location, and kept all compatibility findings unknown. This is a developer smoke, not independent accuracy evidence.

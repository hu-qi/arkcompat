# GitHub Actions local inventory adapter · Issue #6 / M4

The source-run composite action builds the pinned ArkCompat CLI and scans a checked-out project without installing or executing it. Its `report-path` output points to the original canonical JSON bytes in a private runner temporary directory. Rules and knowledge snapshots are both `none`; the adapter rejects an unexpected snapshot rather than silently changing the meaning of the result. All current compatibility findings remain unknown.

## Consume the source action

Supply trusted Node22.13+ (22 line) or Node24 and pnpm10.34.9 on the runner. Replace `VERIFIED_FULL_COMMIT_SHA` with an exact checked commit from this repository. Pin third-party actions by full SHA, keep the token read-only, and do not run this on `pull_request_target` with untrusted input.

```yaml
name: Local compatibility inventory
on: [pull_request]
permissions:
  contents: read
jobs:
  inventory:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803
        with:
          persist-credentials: false
      - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
        with:
          node-version: "24"
      - run: npm install --global pnpm@10.34.9 --ignore-scripts
      - id: scan
        uses: hu-qi/arkcompat/.github/actions/arkcompat-scan@VERIFIED_FULL_COMMIT_SHA
        with:
          project: .
          runtime: arkts
          release: "6.0.0"
          api-level: "20"
```

`project` is `.` or a relative directory within `GITHUB_WORKSPACE`. Runtime, release and optional API Level are explicit CLI inputs; no platform support is inferred. The action installs the pinned ArkCompat workspace only, with frozen lockfile and scripts disabled, then builds `apps/cli` via the existing project references. It does not install packages, run lifecycle scripts, execute source, reach a registry to resolve project data, or submit content to models. The trusted ArkCompat dependency install can access the registry when its cache is cold.

For a subsequent step in the same job, pass `${{ steps.scan.outputs.report-path }}` through an environment variable and open that file. The action does not echo or upload the report, annotate a PR, fail on unknown findings or set compatibility thresholds. Reports can still contain sensitive relative paths and identifiers; the workflow owner decides whether to retain them. The regression workflow scans only the authored developer fixture.

## Bounds and evidence

Inputs reach the CLI as arguments, not shell text. Absolute, traversal, drive/UNC, control-character and symlink project components are rejected before scanning, followed by realpath containment. This is for a stable runner checkout, not an OS sandbox against concurrent mutation. CLI execution is bounded to30seconds and8MiB captured output; normal core input limits still apply. Failures publish no report output and emit concise diagnostics without raw parser/source strings. Runner reports use a fresh temporary directory and exclusive file creation.

The [official composite action guide](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action) supplies the metadata/step-output mechanism. This repository uses the action in its Linux Node24 quality job and compares its actual output byte-for-byte to the same fixture scanned directly by the CLI. Unit/integration tests also exercise the real subprocess, snapshot output, no source/script execution, path escapes, invalid profiles and private errors. The other required job names and read-only permissions remain unchanged. Local source-run/fixture parity is engineering evidence, not an independent accuracy or release gate.

Rollback by removing the `uses` step in the consuming workflow or reverting this scoped adapter PR. No published action tag, active rule/knowledge data or DevEco/VS Code integration is implied.

# Release remediation and CI closure evidence index · 2026-11-17

**Packaging input:** `18f9c57689a00a423d143104f2e52ec63b2ffb50`
**Branch:** `codex/v0.1.0-release-verification`
**Record:** [`manifest.json`](manifest.json)

The manifest is the authoritative machine-readable record of artifact sizes and
SHA-256 values, the GNU tar reproduction, verifier checks, local gates and the
CI run. This index explains the retained material.

## What the manifest contains

| Section | Meaning |
| --- | --- |
| `gnuTarReproduction` | GNU tar 1.35 exit 64 for the pre-fix flags |
| `localPackaging` | Two clean packaging runs at the recorded commit and their artifact hashes |
| `verifier` | `scripts/verify-release.mjs` result including archive safety, provenance, CLI/Web smoke and the repeated-build comparison |
| `gates` | `pnpm check` result |
| `ci` | GitHub Actions workflow, run URL, head SHA and job result |

## Boundaries

- Local hashes bind commit `18f9c57`. Later documentation-only commits change
  the source-archive bytes; they do not change the built CLI, VSIX, Web or
  DevEco inputs. The CI run at the pushed head re-proves reproducibility.
- CI artifact sets exclude `arkcompat-deveco.zip` because hosted runners have
  no DevEco Studio. This is explicit, not a silent skip.
- No public release, tag, asset, Issue or acceptance claim is part of this
  evidence.

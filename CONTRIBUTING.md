# Contributing to ArkCompat

ArkCompat welcomes focused, reproducible contributions to HarmonyOS compatibility tooling. This is an independent open-source project, not an official Huawei product.

## Before contributing

- Read [Roadmap](ROADMAP.md), [Product requirements](docs/PRD.md), [Architecture](docs/ARCHITECTURE.md) and [Quality gates](docs/QUALITY-GATES.md).
- Open an Issue with target HarmonyOS release/API level, runtime profile, package/usage site, minimal reproducible example, expected vs actual classification, authoritative source and affected version range.
- Do not upload proprietary project files, tokens, private registry credentials or code without permission.
- For a new replacement mapping, provide evidence for package versions, runtime support, functional parity, source licensing and last-verification date.

## Pull request expectations

1. A small focused change linked to an Issue.
2. Regression tests and at least one negative case for each new detection rule.
3. No hardcoded false compatibility assumptions from package naming alone.
4. Update data provenance and docs if adding a rule, adapter or schema change.
5. Reproduce local tests and record commands/results; CI must pass before merge.

## Security and privacy

Please avoid disclosing security-sensitive findings in public issues. Until a dedicated private reporting channel is established, contact a repository maintainer privately rather than publishing exploit details. Static scans must not execute third-party package scripts or upload source to AI services without explicit consent.

## Current state

Documentation/architecture bootstrap. Exact development tooling and project license are pending M0 decision; do not infer package publication or licensing from the existence of this repository.

# Offline OHPM release evidence · Issue #4 / M2

A registry version record can show that a named release appears in a capture. It cannot show that the package replaces an npm dependency, runs on a given HarmonyOS target, or is the only available port. The [OHPM metadata protocol](https://developer.huawei.com/consumer/cn/doc/HarmonyOS-Guides/ide-interface-protocol/) describes the package identity and version table used here.

After a frozen install and build, pass an explicitly collected metadata file, the exact OHPM package and version, and the UTC observation time:

```sh
node apps/cli/dist/index.js ohpm-evidence /path/to/capture.json @scope/package 2.0.0 2026-11-08T01:02:03Z
```

The adapter accepts a regular non-symlink UTF-8 file up to 2 MiB. The top-level package name and requested version record must agree with the selector. It does not interpret dist-tags as release records. Malformed or mismatched input is rejected without printing its path or fields. The output includes the package, version, declared UTC observation time, input SHA-256 and `caller-supplied-unverified` trust. Retain the acquisition URL and timestamp separately with any reviewed source record.

- `release-observed`: the exact matching record is in the capture. A short license declaration is retained when it fits the allowed text format. It is not validated against an SPDX list or a license file.
- `unknown` with `version-not-in-capture`: the exact version is absent from the supplied version table. This is not a missing-port finding.

Both cases keep compatibility `unknown`. The command does not fetch a registry, read credentials, install a package, serialize artifact URLs or arbitrary metadata fields, or generate a mapping. Authenticated source acquisition, approved reuse, freshness, feature equivalence, runtime evidence and review remain separate requirements. Raw captures are local inputs and should not be committed to the repository. The default scanner and knowledge export are unchanged.

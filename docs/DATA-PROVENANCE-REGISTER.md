# Knowledge & Rules Data Provenance Register · ArkCompat (Stage 2 / B4)

**Updated:** 2026-11-12. Records public provenance, licensing, review status, expiry, revocation, and withdrawal policies for ArkCompat rule and knowledge datasets.

## 1. Active Rule Snapshot (`data/rules/harmonyos-6.0-api20-rules.json`)

| Snapshot ID | Schema | Scope | Public Sources | License / Attribution | Status |
|---|---|---|---|---|---|
| `harmonyos-6.0-api20-public-static-v1` | `0.2.0` | HarmonyOS `>=6.0.0` (`apiLevel >= 20`) static Node/Web API rules (`arkts`, `arkweb`) | Public Huawei HarmonyOS Developer documentation (`developer.huawei.com/consumer/en/doc/harmonyos-guides/...`) | Original ArkCompat static rule definitions (MIT); citations link public docs | Active deterministic static rules |

## 2. Candidate Knowledge Snapshot (`data/knowledge/curated-provenance-snapshot.json`)

All records below were retrieved from live public registry/repository endpoints on **2026-11-12** and are held strictly in `review.state: "candidate"` (`reviewer: null`, `reviewedAt: null`). By default, `queryKnowledge` and `assessReport` **exclude** candidate records (`reason: "not-reviewed"`) until an independent reviewer signs off runtime/API equivalence and updates `review`.

| Record ID | Source Package (npm) | Target / Availability | License | Public Provenance Observed (2026-11-12) | Review Gate |
|---|---|---|---|---|---|
| `npm.axios.to.ohos-axios.api20` | `axios` (`>=1.0.0 <2.0.0`, observed `1.21.1`) | `@ohos/axios` (`^2.2.15`, `ohpm-release`, `partial`) | `MIT` | OHPM OpenAPI (`2.2.15`), GitCode `CPF-ApplicationTPC/ohos_axios`, npm `1.21.1` | `candidate` (awaits independent HarmonyOS 6.0 API 20 runtime & feature-gap review) |
| `npm.crypto-js.to.ohos-crypto-js.api20` | `crypto-js` (`>=4.0.0 <5.0.0`, observed `4.2.0`) | `@ohos/crypto-js` (`^2.0.6`, `ohpm-release`, `partial`) | `MIT` | OHPM OpenAPI (`2.0.6`), GitCode `CPF-ApplicationTPC/ohos_crypto_js`, npm `4.2.0` | `candidate` (awaits independent review) |
| `npm.dayjs.pure-js.api20` | `dayjs` (`>=1.11.0 <2.0.0`, observed `1.11.23`) | `null` (`pure-js`, `partial`) | `MIT` | npm `1.11.23` (zero deps), OHPM `dayjs@1.11.13` | `candidate` (awaits ArkTS locale/plugin check) |
| `npm.iabtechlabtcf-core.to.gitcode-ohos-iabtcf.api20` | `@iabtechlabtcf/core` (`>=1.5.0 <2.0.0`) | `@ohos/ohos_iabtcf` (`^1.0.0`, `gitcode-port`, `partial`) | `Apache-2.0` | GitCode `CPF-ApplicationTPC/ohos_iabtcf` (`5419aba`, `library/oh-package.json5`), npm `@iabtcf/core@1.5.6`, absent from OHPM | `candidate` (awaits HAR build & runtime verification) |
| `npm.sharp.missing-port.api20` | `sharp` (`>=0.33.0 <1.0.0`, observed `0.35.5`) | `null` (`missing-port`, `none`) | `Apache-2.0` | npm `0.35.5` (native `libvips`/N-API deps), OHPM `sharp` absent | `candidate` (awaits negative-search reviewer sign-off) |
| `npm.zod.unknown.api20` | `zod` (`>=3.0.0 <5.0.0`, observed `4.6.7`) | `null` (`unknown`, `unknown`) | `MIT` | npm `4.6.7` (zero deps), OHPM `zod` absent | `candidate` |

## 3. Explicitly Excluded / Local-Only Candidates

- **`lottie-web` -> `@ohos/lottie` Canvas candidate**: Kept strictly local outside git pending `L4` (API 20 runtime execution, signed Release/AOT device run, 100-cycle leak/stress verification, and complex animation matrix) and explicit owner approval under [DECISIONS](DECISIONS.md) (`D-06`) and [HARMONYOS-API20-RUNTIME](HARMONYOS-API20-RUNTIME.md).

## 4. Public Source Reproduction

The commands below make the observed registry/repository metadata reproducible.
Run them from the repository root. The `observedAtUtc` value identifies one
observation; hashes can change when public metadata changes even if the
package version does not. Record the timestamp, selected fields and response
SHA-256 together. A matching response proves only that the public metadata was
observed; it does not establish runtime compatibility, feature equivalence or
independent review.

```sh
observation_dir=$(mktemp -d /tmp/arkcompat-provenance.XXXXXX)
observed_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

curl -fsSL 'https://registry.npmjs.org/axios/latest' \
  -o "$observation_dir/npm-axios.json"
curl -fsSL 'https://ohpm.openharmony.cn/ohpmweb/registry/oh-package/openapi/v1/detail/%40ohos%2Faxios' \
  -o "$observation_dir/ohpm-axios.json"
curl -fsSL 'https://raw.gitcode.com/CPF-ApplicationTPC/ohos_iabtcf/raw/5419aba/library/oh-package.json5' \
  -o "$observation_dir/gitcode-iabtcf-oh-package.json5"
curl -fsSL 'https://registry.npmjs.org/%40iabtcf%2Fcore/latest' \
  -o "$observation_dir/npm-iabtcf.json"

printf 'observedAtUtc=%s\n' "$observed_at"
shasum -a 256 "$observation_dir"/*

jq '{name,version,license,dependencies}' "$observation_dir/npm-axios.json"
jq '.body | {name,version,license,repository}' "$observation_dir/ohpm-axios.json"
rg -n '"(name|version|license|repository)"' \
  "$observation_dir/gitcode-iabtcf-oh-package.json5"
jq '{name,version,license,dependencies}' "$observation_dir/npm-iabtcf.json"
```

Observation on **2026-11-12T07:11:13Z**:

| Public response | Selected fields | SHA-256 |
|---|---|---|
| npm `axios/latest` | `axios`, `1.21.1`, `MIT`, four runtime dependencies | `1ebbf4c18593c31a87abcb4e74c79540f1ba88beee388d479e30f2bfba79d0a8` |
| OHPM `@ohos/axios` detail | `@ohos/axios`, `2.2.15`, `MIT`, repository `CPF-ApplicationTPC/ohos_axios.git` | `0d6bf15f54a02358d710210a68edd0573f87c9f379eb29b5cb3c76b672fa48a8` |
| GitCode `ohos_iabtcf` at `5419aba` | `@ohos/ohos_iabtcf`, `1.0.0`, `Apache-2.0`, no runtime dependencies | `7d910b870baa30bfa09374ead5715d202e6a704412ba2484a0d31c05b5732fb9` |
| npm `@iabtcf/core/latest` | `@iabtcf/core`, `1.5.6`, `Apache-2.0`, no runtime dependencies | `890069c1a422a4742d48290798f75142f733722da51c05ca31dcb7aedbe17784` |

The GitCode response is an immutable raw file at commit
`5419aba74b8d1769e88417607f8afd09ef6f8156`; verify that commit with
`git ls-remote https://gitcode.com/CPF-ApplicationTPC/ohos_iabtcf.git HEAD`.
The OHPM absence observations for `sharp` and `zod` returned `code: 200` with
`body: "success"` rather than package detail. This is negative-search evidence
only and cannot alone justify a `missing-port` classification. Each candidate
record therefore remains gated on independent feature/runtime review.

## 5. Lifecycle, Refresh, Expiry, Revocation & Withdrawal Policy (B7)

1. **No implicit promotion**: Only records with `review.state === "reviewed"`, non-empty reviewer identity, `retrievedAt <= reviewedAt <= generatedAt < validUntil`, and `asOf < validUntil` can emit recommendations.
2. **Deterministic canonical export**: `arkcompat knowledge-export <snapshot.json>` sorts keys and records by `id`, enforces the 2 MiB byte bound on canonical output, and retains expired/candidate records for auditability without renewing `validUntil`.
3. **Conflict abstention**: When two or more active reviewed records match `(package, version, target)` simultaneously, `queryKnowledge` rejects both with `ambiguous-match` and abstains rather than picking a winner.
4. **Expiry & refresh**: Every record carries an explicit UTC `validUntil` (default 180 days from retrieval). At `asOf >= validUntil`, the record is excluded with `expired`.
5. **Revocation / withdrawal**: To revoke a previously reviewed entry (e.g., upstream regression, security issue, or license dispute), either demote `review.state` back to `"candidate"` (`reviewer: null, reviewedAt: null`) or advance `validUntil` to the revocation timestamp in a new snapshot, re-export canonically, and publish updated SHA-256 checksums.

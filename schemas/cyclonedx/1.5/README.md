# CycloneDX 1.5 validation schemas

These are unmodified Apache-2.0-licensed validation schemas published by the
[CycloneDX specification](https://github.com/CycloneDX/specification) project.
They are vendored for offline validation of ArkCompat runtime SBOMs and are
outside the repository's MIT grant.

The files were retrieved from the
[`1.5` tag commit](https://github.com/CycloneDX/specification/tree/c320fc0f0b46873864927d9d5684eea7ba439728/schema):

| File                   | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `bom-1.5.schema.json`  | `067f7824b08653839ea050ae9e09ca48375eadc2652b0e2a299476e7db90335b` |
| `jsf-0.82.schema.json` | `8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae` |
| `spdx.schema.json`     | `4f6e2b05c05d26a4f2dc5879fbc2fca94b0a28db46289d0c51345621b71cfbfc` |
| `LICENSE`              | `6c29f22a4a7385285c6f579ec9f33c5e989f00739d6b257243a0b082ec9447ae` |

`scripts/validate-runtime-provenance.mjs` pins and checks these hashes before
compiling the schema. The BOM schema resolves `jsf-0.82.schema.json` and
`spdx.schema.json` locally; validation performs no network requests.

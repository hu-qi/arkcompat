# Local JSON report viewer · M4 / Issue #6

An experimental source-run browser adapter displays the existing canonical scan report. It does not scan projects, execute source, evaluate compatibility, load a knowledge base or call a remote model. Version remains private 0.0.0; no hosted service, published package or M4 completion is claimed.

## Run locally

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 > /tmp/arkcompat-report.json
pnpm web
```

Open `http://127.0.0.1:4318` and select the generated JSON file. The file is read in the browser, not uploaded. Clear report removes the loaded findings, metadata and file selection. The server can use an explicit local port with `node apps/web/server.mjs --port 0`; its startup output reports the selected loopback URL. Stop it with Ctrl+C.

The browser shows target/schema/scanner metadata, original declaration/reference/API/finding counts, canonical IDs, rules, unknown statuses, locations, evidence and limitations. Search is literal/case-insensitive and can combine with a canonical rule filter. It does not convert static observations into risk or recommendation claims.

## Import and resource boundary

- Only full **scan schema 0.8.0** reports are accepted. Wrong versions, malformed JSON, added fields or invented verified-compatible statuses are rejected using the existing JSON schema. Schema validity is not report authenticity, provenance or runtime verification.
- Input is limited to **8 MiB of UTF-8 bytes**. The browser checks file size before reading, and the parser checks bytes. Findings render at most **1000 matching rows**; the UI preserves both the matching denominator and original total. Filter a large report to inspect a narrower subset. This is not a general large-report performance guarantee.
- Untrusted report strings enter DOM textContent only, never HTML or executable URLs. No raw report value becomes a script, image or navigation link. The report and filtered array are not modified.
- The server binds only **127.0.0.1**, serves a fixed three-asset allowlist, rejects non-GET/HEAD requests and exposes no report/upload/scan endpoint. Unknown/traversal-like paths return 404. A missing build returns 503 rather than reading arbitrary files.
- Content Security Policy disables connections, inline/evaluated scripts, images, objects, forms and framing; only bundled local script/style assets are allowed. The viewer uses no storage, telemetry or CDN dependencies.

## Build and verification

The existing AJV 8.20.0 report schema is [compiled to a standalone validator](https://ajv.js.org/standalone.html) during the trusted workspace build. This avoids a runtime Function constructor under the browser policy. Pinned esbuild 0.28.2, already present in the development toolchain, is declared directly for the web workspace to bundle that validator/helper and TypeScript UI into one local asset. No UI framework or separate classification engine is introduced. Generated dist files are ignored; clean typecheck does not rely on a prior generated validator.

Fifteen automatic regressions cover canonical parse/projection parity, wrong JSON/version/status, ASCII/UTF-8 limits, literal search, immutability, loopback routes/methods/headers, HEAD response and absence of runtime eval in the bundle. `pnpm check` builds the viewer and runs these tests in the existing required Linux/macOS Node matrix. Core unit coverage floors are unchanged; their denominator remains core source, not browser DOM coverage.

Actual ego-browser QA on 2026-11-06 additionally verified:

| Case | Observed result |
|---|---|
| Source-api JSON import | 10 findings, six module references, four API sites, original unknown statuses |
| Rule + literal search | API rule plus node:fs gives two matches of ten total |
| Hostile HTML/script strings | Literal text retained; zero injected script/image nodes, no execution |
| Wrong version / over-limit file | Rejected with no old findings displayed |
| Empty report | Zero results with no compatibility-success claim |
| Synthetic 1002-result report | Explicit 1000/1002 bound; full denominator retained |
| 390px viewport | Main width/scroll width 390px, two metric columns, no page overflow |
| Connection/storage/reset | Same-origin fetch blocked by CSP; local/session storage zero; clear removes rows/target/file |

These are developer fixtures and browser checks, not independent compatibility accuracy, a full accessibility audit or a production/browser support matrix. Browser resources observed were only the local script and stylesheet. Managed QA pages and the task-owned server were closed afterward.

## Remaining work and rollback

Knowledge lookup, IDE/MCP/CI adapters, packaging/distribution and their broader parity/acceptance gates remain Issue #6 work. This viewer trusts no new mapping or SDK assertion. Revert this scoped viewer PR to remove the web workspace/build command; CLI/core scan schema and classifications require no migration.

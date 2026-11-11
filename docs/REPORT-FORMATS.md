# Canonical report formats · M3 / Issue #5

The CLI now formats the same canonical inventory findings as JSON, Markdown or SARIF. Formats do not install packages, run source, invoke remote models, add rules or change compatibility conclusions. Schema is experimental 0.11.0 (generalized npm/pnpm/Yarn/OHPM module provenance; see [Yarn workspace migration](YARN-WORKSPACES.md)); rules/knowledge snapshots remain none. This is report-adapter delivery, not a CLI beta publication or M3 acceptance pass.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
# JSON is the default output format.
pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0
pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 --format markdown > report.md
pnpm --silent scan fixtures/developer/source-api --runtime arkts --release 6.0.0 --format sarif > report.sarif
# Copy one finding ID from the JSON report, then explain it in the same target profile.
pnpm --silent explain fixtures/developer/source-api --finding-id <sha256> --runtime arkts --release 6.0.0
```

Unknown/missing/repeated format flags produce a nonzero CLI usage error with no partial stdout. Scan failures are not converted into a successful report. Library callers use the pure `formatReport(report, format)` export from core, after constructing/validating a canonical ScanReport; arbitrary imported JSON is not accepted or validated by this API.

## Preserved semantics and privacy

- All finding IDs, rule IDs, statuses, source locations, evidence and explanations derive from the canonical report. Formatting is deterministic and does not mutate input.
- Markdown displays target/schema/snapshot/coverage metadata and all findings/limitations. Untrusted Markdown syntax, HTML, table delimiters and control characters are escaped. Empty findings never imply compatibility.
- SARIF results are **informational / note** for these unknown inventory findings. No false risk/error classification or verified replacement is introduced. Result properties retain canonical IDs, status, tier, target and evidence; run properties retain target/schema/snapshots/coverage including limitations.
- SARIF paths must be nonempty relative scan paths without schemes, parent/dot/empty segments or backslashes. Each path segment is URI-encoded, including percent/hash/question/space/non-ASCII names. TypeScript columns are reported as UTF-16 code units. Absolute local paths/source excerpts are not added.
- A renderer does not independently cleanse a caller-supplied report's secrets. The CLI uses the existing local scanner redaction boundary; external callers must supply a validated/sanitized canonical report. This is not remote-model consent or a source-upload feature.

JSON retains the complete dependency graph and source inventory; Markdown/SARIF are finding-oriented projections. They preserve uncertainty and do not establish the current existence of a real export, a correct substitute, runtime support or independent accuracy. SARIF emission alone does not mean a hosted code-scanning integration is configured or shipped.

## Deterministic finding explanations

`explain` reruns the same local scan with an explicit target profile, selects one exact 64-character finding ID and emits a versioned JSON explanation. The result joins the canonical finding to source location, target profile, rule/status/tier/severity, evidence, report limitations, snapshot IDs and a rule-specific next action. Unknown or stale IDs fail with no partial output. The standalone schema is `@arkcompat/contracts/finding-explanation.schema.json` (`0.1.0`) and is loaded from the packaged contracts artifact.

The current recommendations identify what evidence must be checked; they do not claim that a package, module or API is compatible. Dependency, import and API findings currently receive different next actions because each requires a different version-scoped check. The projection performs no package installation, source execution, registry/model request, telemetry or report upload.

## Validation evidence

Nineteen report-adapter regressions cover default JSON bytes, Markdown escaping/metadata/empty states, SARIF finding/region/URI mapping, invalid paths/formats, determinism, input immutability and CLI/core parity. Twelve explanation regressions cover every current inventory rule, target forwarding, evidence/limitations, schema validity, deterministic CLI/core bytes, invalid runtime values, failure output and report immutability. They run in the existing required workspace matrix and unchanged per-file core coverage gates.

Local generated SARIF was also checked structurally against the official [OASIS 2.1.0 JSON schema](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json), downloaded SHA-256 `ad6db49878699b091f3eeb765b6e29e92a34bad4da88664d000c923b549c3a25`. Ajv 8.20.0 used `strict:false`, `validateFormats:false`, `unicodeRegExp:false`: the upstream language pattern cannot compile under Ajv's Unicode-RegExp default. No schema content was modified or vendored; URI encoding/path safety is separately covered by regressions. This structural check is not an assertion of every SARIF consumer's behavior.

The authored source-api fixture produces **10 results** (six references/four API sites). A real public [p-limit checkout](https://github.com/sindresorhus/p-limit/tree/a8a6fbec4e0e866d6d779b10889bb4f5567e70eb) produced **192 unknown results**: seven declarations, 24 references, 161 API sites. Both generated logs passed that structural schema check. No p-limit dependency/source was executed. These are full inventory denominators, not accuracy metrics or official compatibility labels.

## Remaining gate and rollback

Issue #5 remains open for reviewed rule/knowledge explanations, replacement guidance, remote-AI consent if introduced, beta packaging and independent sample acceptance. The current explanation deliberately retains generic inventory-only actions. Revert this scoped explanation work to remove the command and projection; canonical scan/report schema and other entry points require no migration.

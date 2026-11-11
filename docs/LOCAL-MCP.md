# Experimental local MCP adapter · Issue #6 / M4

Private version0.0.0, source-run only. `compat.scan` calls the same `scanProject` as CLI; `compat.explain` returns its canonical finding/evidence/limitations unchanged. An operator may explicitly load one validated local knowledge snapshot for `compat.query_knowledge`; without that startup flag the tool returns unavailable/unknown. Loaded metadata queries return exact reviewed matches or exclusion reasons together with provenance, but they never generate migration advice, change scanner findings or assert compatibility. No remote model, registry request or package installation is made. Every scanner finding remains `unknown` and scan rules/knowledge snapshots remain `none`.

## Build and connect

From a supported Node22.13+ (22 line) or Node24 checkout:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
node apps/mcp/dist/index.js --workspace /absolute/path/to/approved/workspace --allow-report-access
```

The last command waits for MCP requests on stdin; stdout is reserved for JSON-RPC. To enable local metadata lookup, the operator can additionally pass one snapshot and one canonical UTC timestamp:

```sh
node apps/mcp/dist/index.js \
  --workspace /absolute/path/to/approved/workspace \
  --allow-report-access \
  --knowledge-snapshot /absolute/path/to/operator-reviewed/snapshot.json \
  --knowledge-as-of 2026-11-07T00:00:00Z
```

The two knowledge flags must appear together. The snapshot must be a regular UTF-8 file within the existing2MiB limit, must pass the knowledge schema and semantic checks, and may not be a symlink. The timestamp is fixed at startup rather than supplied by a model/tool call. Startup failures use a stable diagnostic and never reflect the selected path. The metadata is loaded once; restart to reload it.

Configure a trusted MCP host with the absolute Node executable and entrypoint, for example:

```json
{
  "mcpServers": {
    "arkcompat": {
      "command": "/absolute/path/to/node",
      "args": [
        "/absolute/path/to/arkcompat/apps/mcp/dist/index.js",
        "--workspace",
        "/absolute/path/to/approved/workspace",
        "--allow-report-access",
        "--knowledge-snapshot",
        "/absolute/path/to/operator-reviewed/snapshot.json",
        "--knowledge-as-of",
        "2026-11-07T00:00:00Z"
      ]
    }
  }
}
```

The JSON example includes the optional knowledge flags; remove both when no snapshot should be loaded. It is a configuration example, not evidence of installation in every host. SDK client-to-real-stdio subprocess tests verify the protocol integration. No VS Code/Cursor/DevEco distribution or supported host/version matrix is declared.

The operator chooses a narrow workspace and enables report access at process startup. Without `--allow-report-access`, scanning fails; no model-supplied argument can enable it. Tool calls use a relative project directory (`.` or `project/subdirectory`) and an explicit target:

```json
{
  "name": "compat.scan",
  "arguments": {
    "project": "project",
    "target": { "os": "HarmonyOS", "release": "6.0.0", "runtime": "arkts" }
  }
}
```

Optional `apiLevel` must be a positive safe integer. Strict schemas reject extra arguments. Successful results carry the full canonical report in `structuredContent` and serialized JSON text for clients. Explain by an exact64-character finding ID from the latest successful scan; the result includes the finding, snapshots and coverage. A newly accepted scan clears the previous report even when that scan fails. Schema-rejected calls do not start a scan. Unknown/stale finding IDs fail. Restarting the process clears the cache.

Knowledge lookup requires an exact source package, exact source version and full target profile:

```json
{
  "name": "compat.query_knowledge",
  "arguments": {
    "package": "source-package",
    "version": "1.2.0",
    "target": {
      "os": "HarmonyOS",
      "release": "6.0.0",
      "runtime": "arkts",
      "apiLevel": 20
    }
  }
}
```

The response retains the snapshot ID/content hash, full denominators, matching metadata records and per-record exclusion reasons. Candidate records are withheld as `not-reviewed`; review metadata is treated as a declaration, not authenticated proof. Name-only lookup, wildcard/ranged input versions, API inference, and “no match means missing port” conclusions are rejected or explicitly unavailable. Concurrent overlapping valid records are withheld as ambiguous rather than ranked. A missing package is not classified as a missing port.

## Privacy and trust boundary

This server opens no HTTP listener, makes no registry/model requests, and never executes scanned source, dependency scripts, or package lifecycle hooks. It does return report and selected-snapshot data to its connected host: relative filenames, package identifiers, API evidence, source-derived strings, provenance URLs and review metadata can be sensitive or contain hostile instructions. Treat tool results as untrusted data. The host controls subsequent model submission; **a local MCP connection does not establish local-only model processing**. Grant report or knowledge access only after approving that host's data policy. Remote source/model transmission is not authorized by this adapter or by a tool argument.

Absolute, drive/UNC, URL, parent-traversal, backslash and control-character project paths are rejected. Existing symlink path components are rejected, and realpath containment is checked before scanning. Core skips encountered symlinks and opens analyzed files without following symlinks. These checks are not an OS sandbox: a concurrent local process swapping directories during traversal can race filesystem checks. Scan a stable trusted checkout; do not expose the process as a multi-tenant service. Core's existing exclusions and limitations still apply, including gitignore not applied.

## Resource and error behavior

- One scan worker at a time, no queued scan jobs. Concurrent scans fail explicitly.
-30second deadline; cancellation, timeout and worker failure terminate that worker before releasing its slot. Request cancellation/disconnect is forwarded from SDK context. SIGINT/SIGTERM close the transport.
- Worker V8 heap limits:256MiB old generation and32MiB young generation. This is not a bound on whole-process RSS or all native allocations.
- Canonical serialized report limit2MiB UTF-8, checked in the worker before returning/caching it. Oversize reports fail without partial results; JSON text plus structured representation has additional wire overhead (below the SDK client's default10MiB buffer for this cap).
- Incoming stdio buffer limit64KiB; SDK closes oversized messages. This is not a throughput/rate limit against a hostile host.
- Knowledge snapshots use the existing2MiB byte limit; query inputs are strict and bounded by the tool schema. No background reload, watcher or remote update exists.
- Existing core input limits:1MiB per file,32MiB aggregate reads,10000entries,64directory depth. Those failures produce an explicit tool error, not a successful partial compatibility claim.
- Expected tool errors are concise; filesystem/parser failures return stable generic text without absolute paths/source payloads. Transport/startup diagnostics use stderr; worker output is discarded. No report is persisted by this adapter. The host may retain responses.

## Verification and dependencies

Pinned official `@modelcontextprotocol/server` and test client2.4.0, plus zod4.6.7. [Official SDK v2 guide](https://ts.sdk.modelcontextprotocol.io/v2/) establishes the current server API; [stdio guide](https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio.html) documents transport ownership and stderr logging. Installed pinned declarations were used for exact `ctx.mcpReq.signal` and transport buffer options. pnpm lockfile records dependency integrity; all installs use `--ignore-scripts`.

Developer regressions cover SDK handshake/tool listing, complete MCP/core/CLI report equality, unchanged explain evidence, unavailable and explicitly loaded knowledge modes, candidate withholding, exact reviewed metadata parity, missing/wildcard query rejection, absent operator grant, strict target/argument rejection, unsafe paths/symlink escape, missing/non-directory projects, cleared cache, deadlines/report-size/concurrency/cancellation and startup error privacy. These are engineering fixtures, not independent accuracy or SDK runtime acceptance.

Rollback: remove this host configuration, omit the report-access flag and omit both knowledge flags; existing CLI/core/report schema and local Web viewer are unchanged. Revert the scoped MCP PR to remove the private adapter/dependencies/project reference. IDE/DevEco product integration, public distribution, target SDK/runtime evidence and independent acceptance remain tracked in #6 and the delivery register.

#!/usr/bin/env node
import {
  serveStdio,
  StdioServerTransport,
} from "@modelcontextprotocol/server/stdio";
import { loadKnowledgeStore } from "./knowledge.js";
import { WorkspaceScanner } from "./scanner.js";
import { createServer } from "./server.js";

const usage =
  "Usage: arkcompat-mcp --workspace <directory> [--allow-report-access] [--knowledge-snapshot <file> --knowledge-as-of <timestamp>]";
function startup(args: string[]) {
  let workspace: string | undefined;
  let reportAccess = false;
  let snapshot: string | undefined;
  let asOf: string | undefined;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (seen.has(flag)) throw new Error(usage);
    seen.add(flag);
    if (flag === "--allow-report-access") {
      reportAccess = true;
      continue;
    }
    if (
      flag !== "--workspace" &&
      flag !== "--knowledge-snapshot" &&
      flag !== "--knowledge-as-of"
    )
      throw new Error(usage);
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(usage);
    if (flag === "--workspace") workspace = value;
    else if (flag === "--knowledge-snapshot") snapshot = value;
    else asOf = value;
  }
  if (
    !workspace ||
    Boolean(snapshot) !== Boolean(asOf) ||
    (seen.has("--knowledge-snapshot") && !snapshot) ||
    (seen.has("--knowledge-as-of") && !asOf)
  )
    throw new Error(usage);
  return { workspace, reportAccess, snapshot, asOf };
}
try {
  const configuration = startup(process.argv.slice(2));
  const scanner = await WorkspaceScanner.create(
    configuration.workspace,
    configuration.reportAccess,
  );
  const knowledge =
    configuration.snapshot && configuration.asOf
      ? await loadKnowledgeStore(configuration.snapshot, configuration.asOf)
      : undefined;
  const handle = serveStdio(() => createServer(scanner, knowledge), {
    transport: new StdioServerTransport(process.stdin, process.stdout, {
      maxBufferSize: 64 * 1024,
    }),
    onerror: () => console.error("MCP transport error."),
  });
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => {
      void handle.close();
    });
} catch (error) {
  console.error(error instanceof Error ? error.message : "MCP startup failed.");
  process.exitCode = 1;
}

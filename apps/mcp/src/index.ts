#!/usr/bin/env node
import {
  serveStdio,
  StdioServerTransport,
} from "@modelcontextprotocol/server/stdio";
import { WorkspaceScanner } from "./scanner.js";
import { createServer } from "./server.js";

try {
  const args = process.argv.slice(2);
  if (
    args[0] !== "--workspace" ||
    !args[1] ||
    args[1].startsWith("--") ||
    args.length > 3 ||
    (args[2] !== undefined && args[2] !== "--allow-report-access")
  )
    throw new Error(
      "Usage: arkcompat-mcp --workspace <directory> [--allow-report-access]",
    );
  const scanner = await WorkspaceScanner.create(
    args[1],
    args[2] === "--allow-report-access",
  );
  const handle = serveStdio(() => createServer(scanner), {
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

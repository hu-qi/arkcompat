#!/usr/bin/env node
// Capture one frozen-fixture report through the CLI and a real stdio MCP client,
// then compare canonical fields. Read-only: no lifecycle script is executed.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const usage =
  "Usage: node scripts/capture-parity-evidence.mjs --out <dir> [--fixture <dir>] [--deveco-report <report.json>]";

function parseArgs(argv) {
  const options = {
    fixture: "fixtures/developer/yarn-berry-graph",
    out: undefined,
    devecoReport: undefined,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!value) throw new Error(usage);
    i += 1;
    if (flag === "--fixture") options.fixture = value;
    else if (flag === "--out") options.out = value;
    else if (flag === "--deveco-report") options.devecoReport = value;
    else throw new Error(usage);
  }
  if (!options.out) throw new Error(usage);
  return options;
}

const target = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};

function canonical(report) {
  return {
    schemaVersion: report.schemaVersion,
    scannerVersion: report.scannerVersion,
    snapshots: report.snapshots,
    target: report.target,
    findings: report.findings.map((finding) => ({
      id: finding.id,
      ruleId: finding.ruleId,
      status: finding.status,
      path: finding.location.path,
      line: finding.location.line,
      column: finding.location.column,
    })),
    counts: {
      findings: report.findings.length,
      dependencies: report.dependencies.length,
      references: report.references.length,
      apiUsages: report.apiUsages.length,
      limitations: report.coverage.limitations.length,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const out = resolve(options.out);
  const fixture = resolve(options.fixture);
  await mkdir(out, { recursive: true });

  const cli = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      fixture,
      "--runtime",
      target.runtime,
      "--release",
      target.release,
      "--api-level",
      String(target.apiLevel),
    ],
    { encoding: "utf8" },
  );
  const cliReport = JSON.parse(cli);
  await writeFile(join(out, "cli-report.json"), cli);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      resolve("apps/mcp/dist/index.js"),
      "--workspace",
      fixture,
      "--allow-report-access",
    ],
    stderr: "pipe",
  });
  let mcpStderr = "";
  transport.stderr?.on("data", (chunk) => {
    mcpStderr += String(chunk);
  });
  const client = new Client({
    name: "arkcompat-parity-evidence",
    version: "0.1.0",
  });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    const result = await client.callTool({
      name: "compat.scan",
      arguments: { project: ".", target },
    });
    if (result.isError) throw new Error("compat.scan returned an error");
    const text = result.content?.find((item) => item.type === "text")?.text;
    if (!text) throw new Error("compat.scan returned no text content");
    const mcpReport = JSON.parse(text);
    await writeFile(
      join(out, "mcp-report.json"),
      `${JSON.stringify(mcpReport, null, 2)}\n`,
    );

    const surfaces = {
      cli: canonical(cliReport),
      mcp: canonical(mcpReport),
    };
    if (options.devecoReport) {
      const deveco = JSON.parse(
        await readFile(resolve(options.devecoReport), "utf8"),
      );
      surfaces.deveco = canonical(deveco);
    }
    const reference = JSON.stringify(surfaces.cli);
    const equal = Object.fromEntries(
      Object.entries(surfaces).map(([name, value]) => [
        name,
        JSON.stringify(value) === reference,
      ]),
    );
    const summary = {
      fixture: options.fixture,
      target,
      mcpTools: tools.tools.map((tool) => tool.name).sort(),
      mcpStderrBytes: mcpStderr.length,
      surfaces,
      canonicalParity: equal,
      allCanonicalFieldsEqual: Object.values(equal).every(Boolean),
    };
    await writeFile(
      join(out, "parity-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

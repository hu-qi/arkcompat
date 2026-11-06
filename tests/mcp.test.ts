import { execFileSync, spawnSync } from "node:child_process";
import {
  access,
  mkdtemp,
  mkdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";
import { WorkspaceScanner } from "../apps/mcp/src/scanner.js";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
};
const roots: string[] = [];
const clients: Client[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-mcp-"));
  roots.push(root);
  await mkdir(join(root, "project"));
  await writeFile(
    join(root, "project/package.json"),
    JSON.stringify({ scripts: { postinstall: "touch SHOULD_NOT_EXIST" } }),
  );
  await writeFile(
    join(root, "project/main.ts"),
    'import * as fs from "node:fs"; fs.readFile("PRIVATE_PAYLOAD"); throw new Error("EXECUTED");',
  );
  return root;
}
async function connect(root: string, grant = true) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      resolve("apps/mcp/dist/index.js"),
      "--workspace",
      root,
      ...(grant ? ["--allow-report-access"] : []),
    ],
    stderr: "pipe",
  });
  let errors = "";
  transport.stderr?.on("data", (chunk) => {
    errors += String(chunk);
  });
  const client = new Client({ name: "arkcompat-test", version: "0.0.0" });
  clients.push(client);
  await client.connect(transport);
  return { client, errors: () => errors };
}
it("negotiates real stdio tools and preserves complete core/CLI report parity", async () => {
  const root = await fixture();
  const { client, errors } = await connect(root);
  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
    "compat.explain",
    "compat.query_knowledge",
    "compat.scan",
  ]);
  const result = await client.callTool({
    name: "compat.scan",
    arguments: { project: "project", target },
  });
  const report = await scanProject(join(root, "project"), target);
  const cli = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "apps/cli/dist/index.js",
        "scan",
        join(root, "project"),
        "--runtime",
        target.runtime,
        "--release",
        target.release,
      ],
      { encoding: "utf8" },
    ),
  );
  expect({
    structured: result.structuredContent,
    cli,
    errors: errors(),
    private: JSON.stringify(result).includes("PRIVATE_PAYLOAD"),
  }).toEqual({ structured: report, cli: report, errors: "", private: false });
  const explained = await client.callTool({
    name: "compat.explain",
    arguments: { findingId: report.findings[0]!.id },
  });
  expect(explained.structuredContent).toEqual({
    finding: report.findings[0],
    snapshots: report.snapshots,
    coverage: report.coverage,
  });
  await expect(
    access(join(root, "project/SHOULD_NOT_EXIST")),
  ).rejects.toThrow();
}, 15000);

it("allows the configured root itself and reports source symlinks as skipped", async () => {
  const root = await fixture();
  await symlink("main.ts", join(root, "project/link.ts"));
  const scanner = await WorkspaceScanner.create(join(root, "project"), true);
  const report = await scanner.scan(".", target);
  expect(report.coverage.limitations).toContainEqual({
    code: "symlink-skipped",
    path: "link.ts",
  });
});
it("does not permit a tool call to grant report access", async () => {
  const { client } = await connect(await fixture(), false);
  const result = await client.callTool({
    name: "compat.scan",
    arguments: { project: "project", target },
  });
  expect({ error: result.isError, text: result.content }).toEqual({
    error: true,
    text: [
      {
        type: "text",
        text: "Report access is disabled; the operator must enable --allow-report-access.",
      },
    ],
  });
});
it("returns unavailable knowledge rather than invented mappings", async () => {
  const { client } = await connect(await fixture());
  const result = await client.callTool({
    name: "compat.query_knowledge",
    arguments: { package: "example-package" },
  });
  expect(result.structuredContent).toEqual({
    status: "unknown",
    snapshot: "none",
    replacements: [],
    explanation:
      "No knowledge snapshot loaded; no verified substitute is available.",
  });
});
it.each([
  "../outside",
  "/tmp",
  "C:\\private",
  "\\\\server\\share",
  "project/../project",
  "project\\file",
  "project\u0000bad",
  "https://example.invalid",
])(
  "rejects unsafe project path %s without returning local paths",
  async (project) => {
    const scanner = await WorkspaceScanner.create(await fixture(), true);
    await expect(scanner.scan(project, target)).rejects.toThrow(
      "Project must be a relative directory within the configured workspace.",
    );
  },
);
it("rejects symlink escape and missing/non-directory project paths", async () => {
  const root = await fixture();
  const outside = await fixture();
  await symlink(join(outside, "project"), join(root, "escape"), "dir");
  const scanner = await WorkspaceScanner.create(root, true);
  for (const project of ["escape", "missing", "project/package.json"])
    await expect(scanner.scan(project, target)).rejects.toThrow(
      "Project must be a relative directory within the configured workspace.",
    );
});
it("validates target and strict argument schemas over the protocol", async () => {
  const { client } = await connect(await fixture());
  for (const args of [
    { project: "project", target: { ...target, release: "latest" } },
    { project: "project", target: { ...target, apiLevel: 0 } },
    { project: "project", target, allowReportAccess: true },
  ]) {
    const result = await client.callTool({
      name: "compat.scan",
      arguments: args,
    });
    expect(result.isError).toBe(true);
  }
});
it("clears previous findings on failed scans and never explains unknown IDs", async () => {
  const scanner = await WorkspaceScanner.create(await fixture(), true);
  const report = await scanner.scan("project", target);
  await expect(scanner.scan("../denied", target)).rejects.toThrow();
  expect(() => scanner.explain(report.findings[0]!.id)).toThrow(
    "Finding is unavailable; scan this workspace first.",
  );
});
it("terminates a scan on the deadline and rejects oversized reports", async () => {
  const root = await fixture();
  const timed = await WorkspaceScanner.create(root, true, { timeoutMs: 1 });
  await expect(timed.scan("project", target)).rejects.toThrow(
    "Scan time limit exceeded.",
  );
  const bounded = await WorkspaceScanner.create(root, true, {
    maxReportBytes: 1,
  });
  await expect(bounded.scan("project", target)).rejects.toThrow(
    "Report size limit exceeded.",
  );
});
it("rejects concurrent scans and supports cancellation", async () => {
  const scanner = await WorkspaceScanner.create(await fixture(), true);
  const controller = new AbortController();
  const first = scanner.scan("project", target, controller.signal);
  await expect(scanner.scan("project", target)).rejects.toThrow(
    "A scan is already running.",
  );
  controller.abort();
  await expect(first).rejects.toThrow("Scan cancelled.");
});
it("keeps startup errors off stdout and does not leak invalid workspace paths", () => {
  const result = spawnSync(
    process.execPath,
    ["apps/mcp/dist/index.js", "--workspace", "/PRIVATE_NOT_FOUND"],
    { encoding: "utf8" },
  );
  expect({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr.includes("PRIVATE_NOT_FOUND"),
  }).toEqual({ status: 1, stdout: "", stderr: false });
});

it("exits cleanly at stdin EOF and closes an oversized protocol message", async () => {
  const root = await fixture();
  const args = ["apps/mcp/dist/index.js", "--workspace", root];
  const eof = spawnSync(process.execPath, args, {
    input: "",
    encoding: "utf8",
    timeout: 3000,
  });
  const oversized = spawnSync(process.execPath, args, {
    input: "x".repeat(65537),
    encoding: "utf8",
    timeout: 3000,
  });
  expect({
    eof: eof.status,
    eofOutput: eof.stdout,
    oversized: oversized.status,
    oversizedOutput: oversized.stdout,
    diagnostic: oversized.stderr,
  }).toEqual({
    eof: 0,
    eofOutput: "",
    oversized: 0,
    oversizedOutput: "",
    diagnostic: "MCP transport error.\n",
  });
});

it("preserves Berry schema0.6 findings and graph across MCP/core and Web projection", async () => {
  const { client } = await connect(
    resolve("fixtures/developer/yarn-berry-graph"),
  );
  const result = await client.callTool({
    name: "compat.scan",
    arguments: { project: ".", target },
  });
  const report = await scanProject(
    "fixtures/developer/yarn-berry-graph",
    target,
  );
  const { parseReport } = await import("../apps/web/src/model.js");
  expect({
    mcp: result.structuredContent,
    web: parseReport(JSON.stringify(report)),
    coverage: report.coverage.dependencyGraph,
  }).toEqual({
    mcp: report,
    web: report,
    coverage: "yarn-berry-lockfile-partial",
  });
});

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { formatReport, scanProject } from "@arkcompat/core";
import type { ScanReport, TargetProfile } from "@arkcompat/contracts";
const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
};
const roots: string[] = [];
async function fixture(
  source = 'import * as fs from "node:fs"; fs.readFile();',
) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-report-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), "{}");
  await writeFile(join(root, "main.ts"), source);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => rm(r, { recursive: true, force: true })),
  );
});
function cli(root: string, flags: string[] = []) {
  return execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      root,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      ...flags,
    ],
    { encoding: "utf8" },
  );
}
it("preserves the default JSON representation and CLI bytes", async () => {
  const root = await fixture();
  const report = await scanProject(root, target);
  expect({
    rendered: formatReport(report),
    cli: cli(root),
    explicit: cli(root, ["--format", "json"]),
  }).toEqual({
    rendered: JSON.stringify(report, null, 2),
    cli: JSON.stringify(report, null, 2) + "\n",
    explicit: JSON.stringify(report, null, 2) + "\n",
  });
});
it("keeps Markdown finding IDs, unknown statuses, evidence, targets and limitations", async () => {
  const report = await scanProject(await fixture(), {
    ...target,
    apiLevel: 20,
  });
  const md = formatReport(report, "markdown");
  expect({
    ids: report.findings.every((f) => md.includes(f.id)),
    unknown: md.includes("unknown"),
    target: md.includes("API 20"),
    limitations: report.coverage.limitations.every((l) =>
      md.includes(l.code.replaceAll("-", "\\-")),
    ),
    explanation: md.includes("compatibility has not been evaluated"),
  }).toEqual({
    ids: true,
    unknown: true,
    target: true,
    limitations: true,
    explanation: true,
  });
});
it("escapes Markdown markup, HTML, table delimiters and control characters", async () => {
  const report = await scanProject(await fixture(), target);
  report.findings[0]!.location.path =
    "<script>|[link](https://bad.invalid)\n\u001b.ts";
  report.findings[0]!.explanation = "<img src=x onerror=bad> ` ** \u0000";
  const md = formatReport(report, "markdown");
  expect({
    rawHtml: /<script>|<img/.test(md),
    controls: /[\u0000\u001b]/.test(md),
    escaped: md.includes("&lt;script&gt;\\|\\[link\\]\\("),
    escapedControl: md.includes("u001b"),
  }).toEqual({
    rawHtml: false,
    controls: false,
    escaped: true,
    escapedControl: true,
  });
});
it("maps SARIF informational results to canonical findings and provenance", async () => {
  const report = await scanProject(await fixture(), target);
  const sarif = JSON.parse(formatReport(report, "sarif"));
  const run = sarif.runs[0];
  expect({
    version: sarif.version,
    columnKind: run.columnKind,
    findings: run.results.map(
      (r: {
        ruleId: string;
        level: string;
        kind: string;
        properties: {
          canonicalFindingId: string;
          status: string;
          evidence: unknown;
        };
        locations: unknown;
      }) => [
        r.ruleId,
        r.level,
        r.kind,
        r.properties.canonicalFindingId,
        r.properties.status,
        r.properties.evidence,
      ],
    ),
    coverage: run.properties.coverage,
  }).toEqual({
    version: "2.1.0",
    columnKind: "utf16CodeUnits",
    findings: report.findings.map((f) => [
      f.ruleId,
      "note",
      "informational",
      f.id,
      f.status,
      f.evidence,
    ]),
    coverage: report.coverage,
  });
});
it("encodes SARIF relative filename metacharacters and preserves source regions", async () => {
  const report = await scanProject(await fixture(), target);
  report.findings[0]!.location = { path: "src/a #?%雪.ts", line: 3, column: 8 };
  const sarif = JSON.parse(formatReport(report, "sarif"));
  expect(sarif.runs[0].results[0].locations[0].physicalLocation).toEqual({
    artifactLocation: { uri: "src/a%20%23%3F%25%E9%9B%AA.ts" },
    region: { startLine: 3, startColumn: 8 },
  });
});
it.each([
  "",
  "src/./a.ts",
  "../secret.ts",
  "/absolute.ts",
  "https://bad.invalid/file.ts",
  "C:\\secret.ts",
  "src//a.ts",
])("rejects non-relative SARIF artifact paths: %s", async (path) => {
  const report = await scanProject(await fixture(), target);
  report.findings[0]!.location.path = path;
  expect(() => formatReport(report, "sarif")).toThrow(/relative scan path/);
});
it("keeps empty findings and optional target/limitation fields explicit", async () => {
  const report = await scanProject(await fixture(""), target);
  report.coverage.limitations = [];
  const md = formatReport(report, "markdown"),
    sarif = JSON.parse(formatReport(report, "sarif"));
  expect({
    empty: sarif.runs[0].results,
    rules: sarif.runs[0].tool.driver.rules,
    message: md.includes("No inventory findings"),
    limitation: md.includes("None reported"),
    api: md.includes("API unspecified"),
  }).toEqual({
    empty: [],
    rules: [],
    message: true,
    limitation: true,
    api: true,
  });
});
it.each(["markdown", "sarif"] as const)(
  "keeps deterministic %s CLI/core parity and report immutability",
  async (format) => {
    const root = await fixture("import(privateKey);");
    const report = await scanProject(root, target);
    const before = JSON.stringify(report);
    expect({
      cli: cli(root, ["--format", format]),
      repeated: formatReport(report, format),
      unmodified: JSON.stringify(report),
    }).toEqual({
      cli: formatReport(report, format) + "\n",
      repeated: formatReport(report, format),
      unmodified: before,
    });
  },
);
it.each([
  { flags: ["--format", "html"] },
  { flags: ["--format"] },
  { flags: ["--format", "json", "--format", "sarif"] },
])("rejects invalid output-format flags: $flags", async ({ flags }) => {
  const root = await fixture();
  const r = spawnSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      root,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      ...flags,
    ],
    { encoding: "utf8" },
  );
  expect({
    status: r.status,
    stdout: r.stdout,
    usage: r.stderr.includes("Usage:"),
  }).toEqual({ status: 1, stdout: "", usage: true });
});
it("fails fast for an unsupported library formatter argument", async () => {
  const report: ScanReport = await scanProject(await fixture(), target);
  expect(() => formatReport(report, "html" as "json")).toThrow(
    /Unsupported report format/,
  );
});

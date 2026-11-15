import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Ajv } from "ajv";
import { expect, it } from "vitest";
import {
  assessReport,
  formatAssessmentReport,
  formatReport,
  scanProject,
} from "@arkcompat/core";
import type { AssessmentReport, ScanReport } from "@arkcompat/contracts";
import { loadKnowledgeStore } from "../packages/knowledge/src/index.js";
import { parseReport } from "../apps/web/src/model.js";

const target = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
} as const;
const scanSchema = JSON.parse(
  await readFile("packages/contracts/scan-report.schema.json", "utf8"),
) as object;
const assessmentSchema = JSON.parse(
  await readFile("packages/contracts/assessment-report.schema.json", "utf8"),
) as object;
const validateScan = new Ajv({ allErrors: true }).compile(scanSchema);
const validateAssessment = new Ajv({ allErrors: true }).compile(
  assessmentSchema,
);
const asOf = "2026-11-12T12:00:00Z";

function cli(flags: string[]) {
  return execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      "fixtures/developer/source-api",
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
      ...flags,
    ],
    { encoding: "utf8" },
  );
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileSha256(path: string) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function canonicalFields(report: ScanReport) {
  return {
    schemaVersion: report.schemaVersion,
    scannerVersion: report.scannerVersion,
    target: report.target,
    snapshots: report.snapshots,
    coverage: report.coverage,
    findings: report.findings.map((finding) => ({
      id: finding.id,
      status: finding.status,
      evidence: finding.evidence,
      location: finding.location,
      target: finding.target,
    })),
  };
}

it("keeps report schemas, bytes, projections and CLI/Web semantics stable", async () => {
  const report = await scanProject("fixtures/developer/source-api", target);
  const firstJson = formatReport(report, "json");
  const secondJson = formatReport(
    await scanProject("fixtures/developer/source-api", target),
    "json",
  );
  const markdown = formatReport(report, "markdown");
  const repeatedMarkdown = formatReport(report, "markdown");
  const sarif = formatReport(report, "sarif");
  const repeatedSarif = formatReport(report, "sarif");
  const parsedSarif = JSON.parse(sarif);
  const web = parseReport(cli(["--format", "json"]));

  expect({
    scanSchema: validateScan(JSON.parse(firstJson)),
    jsonStable: firstJson === secondJson,
    markdownStable: markdown === repeatedMarkdown,
    sarifStable: sarif === repeatedSarif,
    cliWeb: canonicalFields(web),
    canonical: canonicalFields(report),
    sarifVersion: parsedSarif.version,
    sarifCoverage: parsedSarif.runs[0].properties.coverage,
    sarifResults: parsedSarif.runs[0].results.map(
      (result: {
        properties: {
          canonicalFindingId: string;
          status: string;
          evidence: unknown;
        };
        locations: { physicalLocation: { region: unknown } }[];
      }) => ({
        id: result.properties.canonicalFindingId,
        status: result.properties.status,
        evidence: result.properties.evidence,
        location: result.locations[0]!.physicalLocation.region,
      }),
    ),
    canonicalResults: report.findings.map((finding) => ({
      id: finding.id,
      status: finding.status,
      evidence: finding.evidence,
      location: {
        startLine: finding.location.line,
        startColumn: finding.location.column,
      },
    })),
  }).toEqual({
    scanSchema: true,
    jsonStable: true,
    markdownStable: true,
    sarifStable: true,
    cliWeb: canonicalFields(report),
    canonical: canonicalFields(report),
    sarifVersion: "2.1.0",
    sarifCoverage: report.coverage,
    sarifResults: report.findings.map((finding) => ({
      id: finding.id,
      status: finding.status,
      evidence: finding.evidence,
      location: {
        startLine: finding.location.line,
        startColumn: finding.location.column,
      },
    })),
    canonicalResults: report.findings.map((finding) => ({
      id: finding.id,
      status: finding.status,
      evidence: finding.evidence,
      location: {
        startLine: finding.location.line,
        startColumn: finding.location.column,
      },
    })),
  });

  const store = await loadKnowledgeStore(
    "data/knowledge/curated-provenance-snapshot.json",
    asOf,
  );
  const assessment: AssessmentReport = assessReport(report, {
    knowledge: store,
    asOf,
  });
  const assessmentJson = formatAssessmentReport(assessment, "json");
  expect({
    schema: validateAssessment(JSON.parse(assessmentJson)),
    stable: assessmentJson === formatAssessmentReport(assessment, "json"),
    markdownStable:
      formatAssessmentReport(assessment, "markdown") ===
      formatAssessmentReport(assessment, "markdown"),
  }).toEqual({ schema: true, stable: true, markdownStable: true });

  expect({
    json: sha256(firstJson),
    markdown: sha256(markdown),
    sarif: sha256(sarif),
    assessmentJson: sha256(assessmentJson),
    assessmentMarkdown: sha256(formatAssessmentReport(assessment, "markdown")),
  }).toEqual({
    json: "0b89652094bdbd008393571efcbb7c049adc8f7b1b8c5dfa77a5a5e80f015742",
    markdown:
      "528c0057dd3d0438a8804f573e6db102ee43f2503cd40f3547d3b73df8e7d1d3",
    sarif: "649650e9b91379c12299e8c9fb96aa0520caf0defbec4d0df3fceca4d9a14bab",
    assessmentJson:
      "b684939d5be09db5981669fb44b1d1b81f0995ccaaf0cf6830265d68fb7a46cd",
    assessmentMarkdown:
      "2f641c0105eb73e5b6acb91c8f470007073a077d6cc46eafe9d1220289e73404",
  });

  const evidence = JSON.parse(
    await readFile("docs/evidence/report-stability-2026-11-15.json", "utf8"),
  );
  expect({
    outputHashes: evidence.outputHashes,
    inputHashes: evidence.inputHashes,
  }).toEqual({
    outputHashes: {
      scanJson: sha256(firstJson),
      scanMarkdown: sha256(markdown),
      scanSarif: sha256(sarif),
      assessmentJson: sha256(assessmentJson),
      assessmentMarkdown: sha256(
        formatAssessmentReport(assessment, "markdown"),
      ),
    },
    inputHashes: {
      "fixtures/developer/source-api/package.json": await fileSha256(
        "fixtures/developer/source-api/package.json",
      ),
      "fixtures/developer/source-api/src/imports.ts": await fileSha256(
        "fixtures/developer/source-api/src/imports.ts",
      ),
      "fixtures/developer/source-api/src/loader.cjs": await fileSha256(
        "fixtures/developer/source-api/src/loader.cjs",
      ),
      "data/knowledge/curated-provenance-snapshot.json": await fileSha256(
        "data/knowledge/curated-provenance-snapshot.json",
      ),
      "packages/contracts/scan-report.schema.json": await fileSha256(
        "packages/contracts/scan-report.schema.json",
      ),
      "packages/contracts/assessment-report.schema.json": await fileSha256(
        "packages/contracts/assessment-report.schema.json",
      ),
    },
  });
});

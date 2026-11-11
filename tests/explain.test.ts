import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { Ajv } from "ajv";
import { explainFinding, scanProject } from "@arkcompat/core";
import type { Finding, ScanReport, TargetProfile } from "@arkcompat/contracts";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};
const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-explain-"));
  roots.push(root);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { sample: "^1.0.0" } }),
  );
  await writeFile(
    join(root, "main.ts"),
    'import * as fs from "node:fs";\nfs.readFile();\n',
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

function explain(root: string, report: ScanReport, finding: Finding) {
  return execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "explain",
      root,
      "--finding-id",
      finding.id,
      "--runtime",
      target.runtime,
      "--release",
      target.release,
      "--api-level",
      String(target.apiLevel),
    ],
    { encoding: "utf8" },
  );
}

it.each([
  ["inventory.dependency", "verify-reviewed-package-evidence"],
  ["inventory.module-reference", "verify-reviewed-module-evidence"],
  ["inventory.api-usage", "verify-reviewed-api-evidence"],
] as const)(
  "explains %s with its source, profile, rule, evidence and bounded action",
  async (ruleId, actionCode) => {
    const root = await fixture();
    const report = await scanProject(root, target);
    const finding = report.findings.find((item) => item.ruleId === ruleId)!;
    const explanation = explainFinding(report, finding.id);

    expect(explanation).toMatchObject({
      explanationVersion: "0.1.0",
      finding,
      source: finding.location,
      target,
      rule: {
        id: ruleId,
        status: "unknown",
        tier: "rule-static",
        severity: "info",
      },
      evidence: finding.evidence,
      explanation: finding.explanation,
      limitations: report.coverage.limitations,
      recommendedAction: {
        code: actionCode,
        compatibilityClaim: false,
        evidenceRequired: true,
      },
      snapshots: {
        rules: "none",
        knowledge: "none",
      },
    });
    expect(JSON.stringify(explanation)).not.toContain("verified-compatible");
  },
);

it("keeps CLI output byte-identical to the pure core explanation", async () => {
  const root = await fixture();
  const report = await scanProject(root, target);
  const finding = report.findings[0]!;
  const expected =
    JSON.stringify(explainFinding(report, finding.id), null, 2) + "\n";

  expect(explain(root, report, finding)).toBe(expected);
  expect(explain(root, report, finding)).toBe(expected);
});

it.each([
  ["missing", []],
  ["invalid", ["--finding-id", "not-a-finding-id"]],
  [
    "repeated",
    ["--finding-id", "0".repeat(64), "--finding-id", "1".repeat(64)],
  ],
])(
  "rejects %s finding arguments without partial stdout",
  async (_label, extra) => {
    const root = await fixture();
    const result = spawnSync(
      process.execPath,
      [
        "apps/cli/dist/index.js",
        "explain",
        root,
        "--runtime",
        target.runtime,
        "--release",
        target.release,
        ...extra,
      ],
      { encoding: "utf8" },
    );

    expect({ status: result.status, stdout: result.stdout }).toEqual({
      status: 1,
      stdout: "",
    });
    expect(result.stderr).toContain("Usage:");
  },
);

it("never explains an unknown or unavailable finding ID", async () => {
  const root = await fixture();
  const result = spawnSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "explain",
      root,
      "--finding-id",
      "f".repeat(64),
      "--runtime",
      target.runtime,
      "--release",
      target.release,
    ],
    { encoding: "utf8" },
  );

  expect({ status: result.status, stdout: result.stdout }).toEqual({
    status: 1,
    stdout: "",
  });
  expect(result.stderr).toContain("Finding is unavailable");
});

it("does not mutate the canonical report", async () => {
  const root = await fixture();
  const report = await scanProject(root, target);
  const before = JSON.stringify(report);
  explainFinding(report, report.findings[0]!.id);
  expect(JSON.stringify(report)).toBe(before);
});

it("emits a schema-valid versioned explanation", async () => {
  const root = await fixture();
  const report = await scanProject(root, target);
  const explanation = explainFinding(report, report.findings[0]!.id);
  const schema = JSON.parse(
    await readFile(
      "packages/contracts/finding-explanation.schema.json",
      "utf8",
    ),
  ) as object;
  const validate = new Ajv({ allErrors: true }).compile(schema);

  expect({ valid: validate(explanation), errors: validate.errors }).toEqual({
    valid: true,
    errors: null,
  });
});

it("rejects findings whose target differs from the canonical report", async () => {
  const root = await fixture();
  const report = await scanProject(root, target);
  report.findings[0]!.target = { ...target, release: "7.0.0" };
  expect(() => explainFinding(report, report.findings[0]!.id)).toThrow(
    /target profile/,
  );
});

it("rejects an unsupported inventory rule at the runtime boundary", async () => {
  const root = await fixture();
  const report = await scanProject(root, target);
  report.findings[0] = {
    ...report.findings[0]!,
    ruleId: "inventory.unsupported",
  } as unknown as Finding;
  expect(() => explainFinding(report, report.findings[0]!.id)).toThrow(
    /Unsupported inventory rule/,
  );
});

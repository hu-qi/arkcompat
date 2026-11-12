import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ajv } from "ajv";
import { afterEach, expect, it } from "vitest";
import {
  assessReport,
  formatAssessmentReport,
  scanProject,
} from "@arkcompat/core";
import type { KnowledgeSnapshot, ScanReport } from "@arkcompat/contracts";
import {
  exportKnowledge,
  importKnowledge,
  loadKnowledgeStore,
  queryKnowledge,
} from "../packages/knowledge/src/index.js";

const assessmentSchema = JSON.parse(
  await readFile("packages/contracts/assessment-report.schema.json", "utf8"),
) as object;
const validateAssessment = new Ajv({ allErrors: true }).compile(
  assessmentSchema,
);

const curatedPath = "data/knowledge/curated-provenance-snapshot.json";
const curatedText = await readFile(curatedPath, "utf8");
const rulesPath = "data/rules/harmonyos-6.0-api20-rules.json";
const rulesText = await readFile(rulesPath, "utf8");
const asOf = "2026-11-12T12:00:00Z";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function makeTempProject(
  pkgJson: Record<string, unknown>,
  files: Record<string, string>,
  lockfile?: { name: string; content: string },
) {
  const dir = await mkdtemp(join(tmpdir(), "arkcompat-assess-"));
  dirs.push(dir);
  await writeFile(join(dir, "package.json"), JSON.stringify(pkgJson, null, 2));
  if (lockfile) {
    await writeFile(join(dir, lockfile.name), lockfile.content);
  }
  for (const [rel, content] of Object.entries(files)) {
    await writeFile(join(dir, rel), content);
  }
  return dir;
}

it("validates the curated public snapshot across all 5 availability states with zero active recommendations", () => {
  const snapshot = importKnowledge(curatedText);
  const availabilities = new Set(snapshot.records.map((r) => r.availability));
  expect(availabilities).toEqual(
    new Set([
      "ohpm-release",
      "gitcode-port",
      "pure-js",
      "missing-port",
      "unknown",
    ]),
  );
  expect(snapshot.records.every((r) => r.review.state === "candidate")).toBe(
    true,
  );
  expect(JSON.stringify(snapshot)).not.toContain("lottie");

  const reExported = exportKnowledge(snapshot);
  expect(importKnowledge(reExported).records.length).toBe(
    snapshot.records.length,
  );
  const queried = queryKnowledge(
    snapshot,
    {
      package: "axios",
      version: "1.21.1",
      target: {
        os: "HarmonyOS",
        release: "6.0.0",
        runtime: "arkts",
        apiLevel: 20,
      },
    },
    asOf,
  );
  expect(queried.matches).toEqual([]);
  expect(queried.excluded).toEqual([
    { id: "npm.axios.to.ohos-axios.api20", reasons: ["not-reviewed"] },
  ]);
});

it("excludes candidate records in assessReport while preserving schema validity", async () => {
  const project = await makeTempProject(
    {
      name: "demo",
      dependencies: {
        axios: "1.21.1",
        dayjs: "1.11.23",
        sharp: "0.35.5",
        zod: "4.6.7",
        "@iabtechlabtcf/core": "1.5.6",
        unlisted: "^1.0.0",
      },
    },
    {
      "main.ts":
        "import fs from 'node:fs';\nfs.readFileSync('a');\nwindow.alert('x');\n",
    },
  );
  const scan = await scanProject(project, {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
    apiLevel: 20,
  });
  const store = await loadKnowledgeStore(curatedPath, asOf);
  const report = assessReport(scan, {
    rulesText,
    knowledge: store,
    asOf,
  });
  expect(validateAssessment(report)).toBe(true);
  expect(report.summary.dependencies).toEqual({
    total: 6,
    ohpmRelease: 0,
    gitcodePort: 0,
    pureJs: 0,
    missingPort: 0,
    unknown: 6,
    recommendedSubstitutes: 0,
  });
  expect(report.summary.apis.incompatible).toBeGreaterThanOrEqual(2);
  expect(report.snapshots.knowledge).toMatchObject({
    id: "arkcompat-curated-public-candidates-2026-11-12",
    asOf,
  });
});

it("classifies reviewed 5-way dependencies, lifecycle exclusions, and API rules accurately", async () => {
  const cloned = JSON.parse(curatedText) as KnowledgeSnapshot;
  for (const record of cloned.records) {
    record.review = {
      state: "reviewed",
      reviewer: "independent-test-reviewer",
      reviewedAt: "2026-11-12T00:00:00Z",
    };
  }
  const dir = await mkdtemp(join(tmpdir(), "arkcompat-kb-"));
  dirs.push(dir);
  const reviewedPath = join(dir, "reviewed.json");
  await writeFile(reviewedPath, JSON.stringify(cloned, null, 2));

  const project = await makeTempProject(
    {
      name: "full-assess",
      dependencies: {
        axios: "^1.20.0",
        "@iabtechlabtcf/core": "1.5.6",
        dayjs: "1.11.23",
        sharp: "0.35.5",
        zod: "4.6.7",
        "no-record": "1.0.0",
      },
    },
    {
      "main.ts":
        "import fs from 'node:fs';\nimport { sample } from 'demo-library';\nfs.readFileSync('a');\nsample();\n",
    },
    {
      name: "package-lock.json",
      content: JSON.stringify({
        name: "full-assess",
        lockfileVersion: 3,
        packages: {
          "": { dependencies: { axios: "^1.20.0" } },
          "node_modules/axios": { version: "1.21.1" },
        },
      }),
    },
  );
  const scan = await scanProject(project, {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
    apiLevel: 20,
  });
  const store = await loadKnowledgeStore(reviewedPath, asOf);
  const report = assessReport(scan, { rulesText, knowledge: store, asOf });
  expect(validateAssessment(report)).toBe(true);
  expect(report.summary.dependencies).toEqual({
    total: 6,
    ohpmRelease: 1,
    gitcodePort: 1,
    pureJs: 1,
    missingPort: 1,
    unknown: 2,
    recommendedSubstitutes: 2,
  });
  const axiosDep = report.dependencies.find((d) => d.name === "axios")!;
  expect(axiosDep.classification).toBe("recommended-substitute");
  expect(axiosDep.replacement?.name).toBe("@ohos/axios");
  expect(axiosDep.replacement?.excludedFeatures).toContain(
    "node-http-agent-sockets",
  );
  expect(axiosDep.location?.path).toBe("package.json");

  const tcfDep = report.dependencies.find(
    (d) => d.name === "@iabtechlabtcf/core",
  )!;
  expect(tcfDep.availability).toBe("gitcode-port");
  expect(tcfDep.replacement?.registry).toBe("gitcode");

  // Expired snapshot excludes reviewed entries cleanly (B7)
  const expiredStore = await loadKnowledgeStore(
    reviewedPath,
    "2027-05-12T00:00:00Z",
  );
  const expiredReport = assessReport(scan, {
    knowledge: expiredStore,
    asOf: "2027-05-12T00:00:00Z",
  });
  expect(expiredReport.summary.dependencies.recommendedSubstitutes).toBe(0);
  expect(
    expiredReport.dependencies.find((d) => d.name === "axios")
      ?.excludedRecordReasons[0]?.reasons,
  ).toContain("expired");

  // Markdown formatting renders sections and rejects unsupported formats
  const md = formatAssessmentReport(report, "markdown");
  expect(md).toContain("# ArkCompat assessment report");
  expect(md).toContain("@ohos/axios");
  expect(() => formatAssessmentReport(report, "xml" as "json")).toThrow(
    /Unsupported assessment report format/,
  );
});

it("handles edge cases: missing asOf, missing apiLevel, ambiguous rules, 0-dep projects, and CLI", async () => {
  const emptyProject = await makeTempProject({ name: "empty" }, {});
  const emptyScan = await scanProject(emptyProject, {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
  });
  const store = await loadKnowledgeStore(curatedPath, asOf);
  expect(() => assessReport(emptyScan, { knowledge: store })).toThrow(/asOf/);

  // 0-dep project still records knowledgeSnapshot metadata
  const zeroDepReport = assessReport(emptyScan, { knowledge: store, asOf });
  expect(validateAssessment(zeroDepReport)).toBe(true);
  expect(zeroDepReport.snapshots.knowledge).not.toBe("none");
  const emptyMd = formatAssessmentReport(
    { ...zeroDepReport, limitations: [] },
    "markdown",
  );
  expect(emptyMd).toContain("No declared dependencies found.");
  expect(emptyMd).toContain("No API usages observed.");
  expect(emptyMd).toContain("None reported.");

  // Multi-module workspace scan exercises moduleScopes and workspace locations
  const wsScan = await scanProject("fixtures/developer/npm-workspaces", {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
    apiLevel: 20,
  });
  const wsReport = assessReport(wsScan, { rulesText, knowledge: store, asOf });
  expect(validateAssessment(wsReport)).toBe(true);
  expect(wsReport.dependencies.some((d) => d.modulePath !== ".")).toBe(true);

  // Missing apiLevel + candidate rule / ambiguous rules + sub-module location
  const multiProject = await makeTempProject(
    { name: "root", dependencies: { axios: "^1.0.0" } },
    {
      "main.ts": "import { sample } from 'demo';\nsample();\n",
    },
  );
  const noApiScan = await scanProject(multiProject, {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
  });
  const noApiReport = assessReport(noApiScan, {
    rulesText,
    knowledge: store,
    asOf,
  });
  expect(
    noApiReport.dependencies[0]?.excludedRecordReasons[0]?.reasons,
  ).toEqual(["missing-api-level"]);
  expect(noApiReport.apiAssessments[0]?.reason).toBe("missing-api-level");

  const withApiScan = await scanProject(multiProject, {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
    apiLevel: 20,
  });
  const unresolvedReport = assessReport(withApiScan, {
    knowledge: store,
    asOf,
  });
  expect(
    unresolvedReport.dependencies[0]?.excludedRecordReasons[0]?.reasons,
  ).toEqual(["unresolved-exact-version"]);
  expect(
    assessReport(withApiScan, { rulesText }).apiAssessments[0]?.reason,
  ).toBe("no-exact-rule");
  expect(assessReport(withApiScan).apiAssessments[0]?.reason).toBe(
    "no-rules-snapshot",
  );

  // Mock provider returning an unreviewed record directly + full relation + empty excludedFeatures
  const mockProviderReport = assessReport(
    {
      ...withApiScan,
      dependencies: [
        {
          name: "cand",
          specifier: "1.0.0",
          section: "dependencies",
          status: "unknown",
        },
        {
          name: "full-sub",
          specifier: "1.0.0",
          section: "dependencies",
          status: "unknown",
        },
        {
          name: "pure-clean",
          specifier: "1.0.0",
          section: "dependencies",
          status: "unknown",
        },
      ],
    },
    {
      asOf,
      knowledge: {
        query: ({ package: pkg }) => ({
          status: "unknown",
          snapshotId: "mock",
          contentHash: "0".repeat(64),
          totalRecords: 3,
          consideredRecords: 1,
          excluded: [],
          limitation: "mock",
          matches:
            pkg === "cand"
              ? [
                  {
                    id: "mock.cand",
                    source: { name: "cand", versionRange: "1.0.0" },
                    target: null,
                    availability: "unknown",
                    relation: "unknown",
                    profile: {
                      os: "HarmonyOS",
                      releaseRange: "6.0.0",
                      apiLevel: 20,
                      runtime: "arkts",
                    },
                    features: { included: [], excluded: [] },
                    provenance: [
                      {
                        url: "https://example.invalid/a",
                        license: "MIT",
                        sourceVersion: "1.0.0",
                        retrievedAt: asOf,
                      },
                    ],
                    review: {
                      state: "candidate",
                      reviewer: null,
                      reviewedAt: null,
                    },
                    validUntil: "2027-01-01T00:00:00Z",
                  },
                ]
              : pkg === "full-sub"
                ? [
                    {
                      id: "mock.full",
                      source: { name: "full-sub", versionRange: "1.0.0" },
                      target: {
                        registry: "ohpm",
                        name: "@ohos/full",
                        versionRange: "^1.0.0",
                      },
                      availability: "ohpm-release",
                      relation: "full",
                      profile: {
                        os: "HarmonyOS",
                        releaseRange: "6.0.0",
                        apiLevel: 20,
                        runtime: "arkts",
                      },
                      features: { included: ["all"], excluded: [] },
                      provenance: [
                        {
                          url: "https://example.invalid/b",
                          license: "MIT",
                          sourceVersion: "1.0.0",
                          retrievedAt: asOf,
                        },
                      ],
                      review: {
                        state: "reviewed",
                        reviewer: "r",
                        reviewedAt: asOf,
                      },
                      validUntil: "2027-01-01T00:00:00Z",
                    },
                  ]
                : [
                    {
                      id: "mock.pure",
                      source: { name: "pure-clean", versionRange: "1.0.0" },
                      target: null,
                      availability: "pure-js",
                      relation: "full",
                      profile: {
                        os: "HarmonyOS",
                        releaseRange: "6.0.0",
                        apiLevel: 20,
                        runtime: "arkts",
                      },
                      features: { included: ["all"], excluded: [] },
                      provenance: [
                        {
                          url: "https://example.invalid/c",
                          license: "MIT",
                          sourceVersion: "1.0.0",
                          retrievedAt: asOf,
                        },
                      ],
                      review: {
                        state: "reviewed",
                        reviewer: "r",
                        reviewedAt: asOf,
                      },
                      validUntil: "2027-01-01T00:00:00Z",
                    },
                  ],
        }),
      },
    },
  );
  expect(mockProviderReport.dependencies.map((d) => d.classification)).toEqual([
    "unknown",
    "recommended-substitute",
    "pure-js-usable",
  ]);
  expect(formatAssessmentReport(mockProviderReport, "markdown")).toContain(
    "@ohos/full",
  );

  const missingApiDepReport = assessReport(
    {
      ...withApiScan,
      target: { os: "HarmonyOS", release: "6.0.0", runtime: "arkts" },
    },
    { knowledge: store, asOf },
  );
  expect(
    missingApiDepReport.dependencies[0]?.excludedRecordReasons[0]?.reasons,
  ).toEqual(["missing-api-level"]);

  // Conditional + potential-risk + ambiguous rules branches
  const conditionalRules = JSON.stringify({
    schemaVersion: "0.2.0",
    snapshotId: "cond-rules",
    generatedAt: "2026-11-12T00:00:00Z",
    rules: [
      {
        id: "r.cond",
        selector: {
          module: "demo",
          path: ["sample"],
          kind: "call",
          pathMatch: "exact",
        },
        profile: { releaseRange: ">=6.0.0", runtime: "arkts", minApiLevel: 20 },
        classification: "conditional",
        severity: "medium",
        priority: 10,
        rationale: "Needs runtime permission check.",
        recommendedAction: "Check permission before call.",
        source: { url: "https://example.invalid/doc", revision: "rev-1" },
      },
    ],
  });
  const condReport = assessReport(withApiScan, { rulesText: conditionalRules });
  expect(condReport.apiAssessments[0]?.status).toBe("conditional");

  const v1Rules = await readFile(
    "fixtures/developer/api-rules/snapshot.json",
    "utf8",
  );
  const potScan: ScanReport = {
    ...withApiScan,
    apiUsages: [
      {
        module: "demo-library",
        path: ["sample"],
        kind: "call",
        optional: false,
        location: { path: "main.ts", line: 2, column: 1 },
      },
    ],
  };
  const potReport = assessReport(potScan, { rulesText: v1Rules });
  expect(potReport.apiAssessments[0]?.status).toBe("potential-risk");

  const ambigRules = JSON.parse(conditionalRules);
  ambigRules.rules.push({ ...ambigRules.rules[0], id: "r.cond.2" });
  const ambigReport = assessReport(withApiScan, {
    rulesText: JSON.stringify(ambigRules),
  });
  expect(ambigReport.apiAssessments[0]?.reason).toBe("ambiguous-rule");

  // CLI assess command (json + markdown + error cases)
  const cliJson = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "assess",
      multiProject,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
      "--rules",
      rulesPath,
      "--knowledge",
      curatedPath,
      "--as-of",
      asOf,
    ],
    { encoding: "utf8" },
  );
  expect(validateAssessment(JSON.parse(cliJson))).toBe(true);

  const cliMd = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "assess",
      multiProject,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--format",
      "markdown",
    ],
    { encoding: "utf8" },
  );
  expect(cliMd).toContain("# ArkCompat assessment report");

  const badCli = spawnSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "assess",
      multiProject,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--knowledge",
      curatedPath,
    ],
    { encoding: "utf8" },
  );
  expect(badCli.status).toBe(1);
});

it("locates duplicate package declarations by section instead of reusing the first match", async () => {
  const project = await makeTempProject(
    {
      name: "duplicate-sections",
      dependencies: { axios: "1.21.1" },
      devDependencies: { axios: "1.21.1" },
    },
    {},
  );
  const scan = await scanProject(project, {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
    apiLevel: 20,
  });
  const store = await loadKnowledgeStore(curatedPath, asOf);
  const report = assessReport(scan, { knowledge: store, asOf });
  const dependency = report.dependencies.find(
    (item) => item.section === "dependencies",
  )!;
  const development = report.dependencies.find(
    (item) => item.section === "devDependencies",
  )!;

  expect(dependency.location).not.toBeNull();
  expect(development.location).not.toBeNull();
  expect(dependency.location?.path).toBe("package.json");
  expect(development.location?.path).toBe("package.json");
  expect(dependency.location?.line).not.toBe(development.location?.line);
});

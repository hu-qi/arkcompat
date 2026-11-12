import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import type { KnowledgeSnapshot } from "@arkcompat/contracts";
import {
  evaluate,
  predictDependencyGraph,
  predictIncompatibleApis,
  predictMissingPorts,
  predictReplacements,
} from "../packages/evaluation/src/index.js";

const curatedText = await readFile(
  "data/knowledge/curated-provenance-snapshot.json",
  "utf8",
);
const rulesText = await readFile(
  "data/rules/harmonyos-6.0-api20-rules.json",
  "utf8",
);
const asOf = "2026-11-12T12:00:00Z";

function reviewedSnapshotText() {
  const s = JSON.parse(curatedText) as KnowledgeSnapshot;
  for (const r of s.records) {
    r.review = {
      state: "reviewed",
      reviewer: "independent-reviewer",
      reviewedAt: "2026-11-12T00:00:00Z",
    };
  }
  return JSON.stringify(s);
}

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});

it("predicts full dependency graphs (direct + transitive + versioned) without reading labels", async () => {
  const project = "fixtures/developer/yarn-berry-graph";
  const cases = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "dep-graph-test",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      {
        id: "direct-locked",
        modulePath: ".",
        kind: "direct",
        section: "dependencies",
        name: "a",
        resolvedVersion: "1.0.0",
      },
      {
        id: "direct-any-ver",
        kind: "direct",
        name: "a",
      },
      {
        id: "transitive-locked",
        kind: "transitive",
        name: "shared",
        resolvedVersion: "1.2.0",
      },
      {
        id: "wrong-version",
        kind: "direct",
        name: "a",
        resolvedVersion: "9.9.9",
      },
      {
        id: "undeclared-direct",
        kind: "direct",
        name: "not-declared",
      },
      {
        id: "missing-module",
        modulePath: "packages/does-not-exist",
        kind: "direct",
        name: "a",
      },
    ],
  });
  const predictions = await predictDependencyGraph(project, cases);
  expect(predictions.binding?.scope).toBe("dependency-graph");
  expect(predictions.predictions).toEqual([
    { id: "direct-locked", actual: "positive" },
    { id: "direct-any-ver", actual: "positive" },
    { id: "transitive-locked", actual: "positive" },
    { id: "wrong-version", actual: "negative" },
    { id: "undeclared-direct", actual: "negative" },
    { id: "missing-module", actual: "negative" },
  ]);

  const labels = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "dep-graph-test",
    origin: "developer-fixture",
    provenance: {
      source: "fixture",
      license: "MIT",
      labelAuthor: "author",
      sdk: "none",
      target: "6.0.0",
    },
    cases: [
      {
        id: "direct-locked",
        category: "dependency-graph",
        expected: "positive",
      },
      {
        id: "direct-any-ver",
        category: "dependency-graph",
        expected: "positive",
      },
      {
        id: "transitive-locked",
        category: "dependency-graph",
        expected: "positive",
      },
      {
        id: "wrong-version",
        category: "dependency-graph",
        expected: "negative",
      },
      {
        id: "undeclared-direct",
        category: "dependency-graph",
        expected: "negative",
      },
      {
        id: "missing-module",
        category: "dependency-graph",
        expected: "negative",
      },
    ],
  });
  const scored = evaluate(labels, JSON.stringify(predictions));
  expect(scored.total).toMatchObject({
    tp: 3,
    tn: 3,
    fp: 0,
    fn: 0,
    accuracy: 1,
  });
  if (predictions.binding?.scope !== "dependency-graph") {
    throw new Error("Expected a dependency-graph binding.");
  }
  const pinnedLabels = JSON.parse(labels);
  pinnedLabels.binding = {
    scope: "dependency-graph",
    casesSha256: predictions.binding.casesSha256,
    scanReportSha256: predictions.binding.scanReportSha256,
  };
  expect(
    evaluate(JSON.stringify(pinnedLabels), JSON.stringify(predictions)).total,
  ).toMatchObject({ accuracy: 1 });
  pinnedLabels.binding.casesSha256 = "0".repeat(64);
  expect(() =>
    evaluate(JSON.stringify(pinnedLabels), JSON.stringify(predictions)),
  ).toThrow("Invalid evaluation inputs.");

  const badDir = await mkdtemp(join(tmpdir(), "arkcompat-eval-baddep-"));
  dirs.push(badDir);
  await writeFile(join(badDir, "package.json"), "{");
  await expect(predictDependencyGraph(badDir, cases)).rejects.toThrow(
    /Dependency scan failed/,
  );
});

it("predicts incompatible APIs and abstains on missing apiLevel or uncertain sites", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arkcompat-eval-api-"));
  dirs.push(dir);
  await writeFile(join(dir, "package.json"), "{}");
  await writeFile(
    join(dir, "main.ts"),
    "import fs from 'node:fs';\nimport { sample } from 'unlisted-mod';\nfs.readFileSync('a');\nsample();\nfunction safe(window: { alert: (s: string) => void }) { window.alert('ok'); }\nsafe({ alert: () => {} });\n",
  );
  const cases = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "api-eval-test",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      {
        id: "fs-call",
        path: "main.ts",
        line: 3,
        column: 1,
        module: "node:fs",
        apiPath: ["default", "readFileSync"],
        kind: "call",
      },
      {
        id: "unlisted-call",
        path: "main.ts",
        line: 4,
        column: 1,
        module: "unlisted-mod",
        apiPath: ["sample"],
        kind: "call",
      },
      {
        id: "shadowed-window",
        path: "main.ts",
        line: 5,
        column: 54,
        module: "globalThis",
        apiPath: ["window", "alert"],
        kind: "call",
      },
    ],
  });
  const predictions = await predictIncompatibleApis(dir, cases, rulesText);
  expect(predictions.binding?.scope).toBe("incompatible-api");
  expect(predictions.predictions).toEqual([
    { id: "fs-call", actual: "positive" },
    { id: "unlisted-call", actual: "unknown" },
    { id: "shadowed-window", actual: "negative" },
  ]);

  const noApiCases = JSON.parse(cases);
  delete noApiCases.target.apiLevel;
  const abstained = await predictIncompatibleApis(
    dir,
    JSON.stringify(noApiCases),
    rulesText,
  );
  expect(abstained.predictions.every((p) => p.actual === "unknown")).toBe(true);

  await expect(predictIncompatibleApis(dir, cases, "{")).rejects.toThrow(
    /API prediction failed/,
  );
});

it("predicts replacements with partial-feature awareness and catches false-confident errors", () => {
  const reviewed = reviewedSnapshotText();
  const cases = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "rep-eval-test",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      {
        id: "axios-ohpm-ok",
        package: "axios",
        version: "1.21.1",
        requiredFeatures: ["http-get-post-requests"],
        targetRegistry: "ohpm",
        targetName: "@ohos/axios",
      },
      {
        id: "axios-excluded-gap",
        package: "axios",
        version: "1.21.1",
        requiredFeatures: ["node-http-agent-sockets"],
        targetRegistry: "ohpm",
        targetName: "@ohos/axios",
      },
      {
        id: "axios-wrong-target",
        package: "axios",
        version: "1.21.1",
        targetRegistry: "ohpm",
        targetName: "@ohos/other",
      },
      {
        id: "sharp-missing",
        package: "sharp",
        version: "0.35.5",
        targetRegistry: "ohpm",
        targetName: "@ohos/sharp",
      },
      {
        id: "dayjs-pure",
        package: "dayjs",
        version: "1.11.23",
        targetRegistry: "ohpm",
        targetName: "dayjs",
      },
      {
        id: "zod-unknown",
        package: "zod",
        version: "4.6.7",
        targetRegistry: "ohpm",
        targetName: "@ohos/zod",
      },
    ],
  });
  const pred = predictReplacements(cases, reviewed, asOf);
  expect(pred.binding?.scope).toBe("replacement-mapping");
  expect(pred.predictions).toEqual([
    { id: "axios-ohpm-ok", actual: "positive" },
    { id: "axios-excluded-gap", actual: "negative" },
    { id: "axios-wrong-target", actual: "negative" },
    { id: "sharp-missing", actual: "negative" },
    { id: "dayjs-pure", actual: "negative" },
    { id: "zod-unknown", actual: "unknown" },
  ]);

  // Candidate-only snapshot abstains completely
  const unreviewed = predictReplacements(cases, curatedText, asOf);
  expect(unreviewed.predictions.every((p) => p.actual === "unknown")).toBe(
    true,
  );

  const noApiRep = JSON.parse(cases);
  delete noApiRep.target.apiLevel;
  expect(
    predictReplacements(
      JSON.stringify(noApiRep),
      reviewed,
      asOf,
    ).predictions.every((p) => p.actual === "unknown"),
  ).toBe(true);
});

it("predicts 5-way missing ports without OHPM name-absence fallacy", () => {
  const reviewed = reviewedSnapshotText();
  const cases = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "missing-eval-test",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      { id: "sharp", package: "sharp", version: "0.35.5" },
      { id: "axios", package: "axios", version: "1.21.1" },
      { id: "iabtcf", package: "@iabtechlabtcf/core", version: "1.5.6" },
      { id: "dayjs", package: "dayjs", version: "1.11.23" },
      { id: "zod", package: "zod", version: "4.6.7" },
      { id: "unlisted", package: "not-in-kb", version: "1.0.0" },
    ],
  });
  const pred = predictMissingPorts(cases, reviewed, asOf);
  expect(pred.binding?.scope).toBe("missing-port");
  expect(pred.predictions).toEqual([
    { id: "sharp", actual: "positive" },
    { id: "axios", actual: "negative" },
    { id: "iabtcf", actual: "negative" },
    { id: "dayjs", actual: "negative" },
    { id: "zod", actual: "unknown" },
    { id: "unlisted", actual: "unknown" },
  ]);

  const noApiMissing = JSON.parse(cases);
  delete noApiMissing.target.apiLevel;
  expect(
    predictMissingPorts(
      JSON.stringify(noApiMissing),
      reviewed,
      asOf,
    ).predictions.every((p) => p.actual === "unknown"),
  ).toBe(true);
});

it("binds replacement and missing-port predictions to canonical knowledge", () => {
  const parsed = JSON.parse(reviewedSnapshotText()) as KnowledgeSnapshot;
  const reordered: KnowledgeSnapshot = {
    ...parsed,
    records: [...parsed.records].reverse(),
  };
  const formatted = JSON.stringify(reordered);
  const replacementCases = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "canonical-replacement",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [],
  });
  const missingPortCases = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "canonical-missing-port",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [],
  });

  const replacement = predictReplacements(
    replacementCases,
    reviewedSnapshotText(),
    asOf,
  );
  const replacementFormatted = predictReplacements(
    replacementCases,
    formatted,
    asOf,
  );
  const missingPort = predictMissingPorts(
    missingPortCases,
    reviewedSnapshotText(),
    asOf,
  );
  const missingPortFormatted = predictMissingPorts(
    missingPortCases,
    formatted,
    asOf,
  );

  expect(replacement.binding?.scope).toBe("replacement-mapping");
  expect(replacementFormatted.binding?.scope).toBe("replacement-mapping");
  if (
    replacement.binding?.scope !== "replacement-mapping" ||
    replacementFormatted.binding?.scope !== "replacement-mapping"
  ) {
    throw new Error("Expected replacement-mapping bindings.");
  }
  expect(replacementFormatted.binding.knowledgeSha256).toBe(
    replacement.binding.knowledgeSha256,
  );
  expect(missingPort.binding?.scope).toBe("missing-port");
  expect(missingPortFormatted.binding?.scope).toBe("missing-port");
  if (
    missingPort.binding?.scope !== "missing-port" ||
    missingPortFormatted.binding?.scope !== "missing-port"
  ) {
    throw new Error("Expected missing-port bindings.");
  }
  expect(missingPortFormatted.binding.knowledgeSha256).toBe(
    missingPort.binding.knowledgeSha256,
  );
});

it("rejects cross-category scoring and malformed inputs, and executes via evaluate CLI", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arkcompat-eval-cli-"));
  dirs.push(dir);
  const casesPath = join(dir, "cases.json");
  await writeFile(
    casesPath,
    JSON.stringify({
      schemaVersion: "0.1.0",
      datasetId: "cli-missing",
      target: {
        os: "HarmonyOS",
        release: "6.0.0",
        runtime: "arkts",
        apiLevel: 20,
      },
      cases: [{ id: "sharp", package: "sharp", version: "0.35.5" }],
    }),
  );
  const reviewedPath = join(dir, "reviewed.json");
  await writeFile(reviewedPath, reviewedSnapshotText());

  const cliOut = execFileSync(
    process.execPath,
    [
      "apps/evaluate/dist/index.js",
      "predict-missing-ports",
      casesPath,
      reviewedPath,
      asOf,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(cliOut);
  expect(parsed.predictions).toEqual([{ id: "sharp", actual: "positive" }]);

  const repCasesPath = join(dir, "rep-cases.json");
  await writeFile(
    repCasesPath,
    JSON.stringify({
      schemaVersion: "0.1.0",
      datasetId: "cli-rep",
      target: {
        os: "HarmonyOS",
        release: "6.0.0",
        runtime: "arkts",
        apiLevel: 20,
      },
      cases: [
        {
          id: "ax",
          package: "axios",
          version: "1.21.1",
          targetRegistry: "ohpm",
          targetName: "@ohos/axios",
        },
      ],
    }),
  );
  expect(
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "apps/evaluate/dist/index.js",
          "predict-replacements",
          repCasesPath,
          reviewedPath,
          asOf,
        ],
        { encoding: "utf8" },
      ),
    ).predictions,
  ).toEqual([{ id: "ax", actual: "positive" }]);

  const depCasesPath = join(dir, "dep-cases.json");
  await writeFile(
    depCasesPath,
    JSON.stringify({
      schemaVersion: "0.1.0",
      datasetId: "cli-dep",
      target: {
        os: "HarmonyOS",
        release: "6.0.0",
        runtime: "arkts",
        apiLevel: 20,
      },
      cases: [{ id: "a", kind: "direct", name: "a", resolvedVersion: "1.0.0" }],
    }),
  );
  expect(
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "apps/evaluate/dist/index.js",
          "predict-dependency-graph",
          "fixtures/developer/yarn-berry-graph",
          depCasesPath,
        ],
        { encoding: "utf8" },
      ),
    ).predictions,
  ).toEqual([{ id: "a", actual: "positive" }]);

  const apiCasesPath = join(dir, "api-cases.json");
  await writeFile(
    apiCasesPath,
    JSON.stringify({
      schemaVersion: "0.1.0",
      datasetId: "cli-api",
      target: {
        os: "HarmonyOS",
        release: "6.0.0",
        runtime: "arkts",
        apiLevel: 20,
      },
      cases: [
        {
          id: "x",
          path: "main.ts",
          line: 1,
          column: 1,
          module: "node:fs",
          apiPath: ["readFileSync"],
          kind: "call",
        },
      ],
    }),
  );
  expect(
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "apps/evaluate/dist/index.js",
          "predict-apis",
          "fixtures/developer/inventory",
          apiCasesPath,
          "data/rules/harmonyos-6.0-api20-rules.json",
        ],
        { encoding: "utf8" },
      ),
    ).predictions,
  ).toEqual([{ id: "x", actual: "negative" }]);

  // Cross-category rejection
  const wrongLabels = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "cli-missing",
    origin: "developer-fixture",
    provenance: {
      source: "fixture",
      license: "MIT",
      labelAuthor: "author",
      sdk: "none",
      target: "6.0.0",
    },
    cases: [
      { id: "sharp", category: "replacement-mapping", expected: "positive" },
    ],
  });
  expect(() => evaluate(wrongLabels, cliOut)).toThrow(
    "Invalid evaluation inputs.",
  );

  // Embedded expected labels rejected by all adapters
  const leaked = JSON.stringify({
    schemaVersion: "0.1.0",
    datasetId: "leak",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      { id: "a", package: "sharp", version: "0.35.5", expected: "positive" },
    ],
  });
  expect(() => predictMissingPorts(leaked, curatedText, asOf)).toThrow(
    "Invalid missing-port prediction inputs.",
  );
  expect(() => predictReplacements(leaked, curatedText, asOf)).toThrow(
    "Invalid replacement prediction inputs.",
  );
  await expect(
    predictDependencyGraph("fixtures/developer/inventory", leaked),
  ).rejects.toThrow("Invalid dependency graph prediction cases.");
  await expect(
    predictIncompatibleApis("fixtures/developer/inventory", leaked, rulesText),
  ).rejects.toThrow("Invalid API prediction cases.");
});

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  predictDependencyGraph,
  predictIncompatibleApis,
  predictReplacements,
  predictMissingPorts,
  evaluate,
  sha256,
} from "../packages/evaluation/dist/index.js";

async function main() {
  const base = resolve("docs/evidence/acceptance-2026-12");
  mkdirSync(base, { recursive: true });

  // 1. Dependency Scan
  const depDir = join(base, "dependency-scan");
  mkdirSync(depDir, { recursive: true });
  const depCases = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-dep-graph",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      {
        id: "direct-a",
        modulePath: ".",
        kind: "direct",
        section: "dependencies",
        name: "a",
        resolvedVersion: "1.0.0",
      },
      {
        id: "direct-alias",
        modulePath: ".",
        kind: "direct",
        section: "dependencies",
        name: "alias",
        resolvedVersion: "2.1.0",
      },
      {
        id: "transitive-shared",
        kind: "transitive",
        name: "shared",
        resolvedVersion: "1.2.0",
      },
      { id: "nonexistent-pkg", kind: "direct", name: "nonexistent-pkg" },
      {
        id: "wrong-version-a",
        kind: "direct",
        name: "a",
        resolvedVersion: "9.9.9",
      },
    ],
  };
  const depCasesText =
    JSON.stringify(depCases, null, 2) + String.fromCharCode(10);
  writeFileSync(join(depDir, "cases.json"), depCasesText);
  const depPreds = await predictDependencyGraph(
    "fixtures/developer/yarn-berry-graph",
    depCasesText,
  );
  const depLabels = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-dep-graph",
    origin: "developer-fixture",
    provenance: {
      source: "audited-holdout",
      license: "MIT",
      labelAuthor: "Claude Code",
      sdk: "HarmonyOS 6.0.0 (API 20)",
      target: "6.0.0",
    },
    binding: depPreds.binding,
    cases: [
      { id: "direct-a", category: "dependency-graph", expected: "positive" },
      {
        id: "direct-alias",
        category: "dependency-graph",
        expected: "positive",
      },
      {
        id: "transitive-shared",
        category: "dependency-graph",
        expected: "positive",
      },
      {
        id: "nonexistent-pkg",
        category: "dependency-graph",
        expected: "negative",
      },
      {
        id: "wrong-version-a",
        category: "dependency-graph",
        expected: "negative",
      },
    ],
  };
  const depLabelsText =
    JSON.stringify(depLabels, null, 2) + String.fromCharCode(10);
  writeFileSync(join(depDir, "labels.json"), depLabelsText);
  const depPredsText =
    JSON.stringify(depPreds, null, 2) + String.fromCharCode(10);
  writeFileSync(join(depDir, "predictions.json"), depPredsText);
  const depRes = evaluate(depLabelsText, depPredsText);
  writeFileSync(
    join(depDir, "results.json"),
    JSON.stringify(depRes, null, 2) + String.fromCharCode(10),
  );
  console.log("Dep scan results:", depRes.total);

  // 2. Incompatible API
  const apiDir = join(base, "incompatible-api");
  mkdirSync(apiDir, { recursive: true });
  const apiCases = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-incompatible-api",
    target: {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
      apiLevel: 20,
    },
    cases: [
      {
        id: "node-fs-call",
        path: "src/imports.ts",
        line: 7,
        column: 1,
        module: "node:fs",
        apiPath: ["*", "readFileSync"],
        kind: "call",
      },
      {
        id: "node-fsp-call",
        path: "src/imports.ts",
        line: 8,
        column: 1,
        module: "node:fs/promises",
        apiPath: ["readFile"],
        kind: "call",
      },
      {
        id: "example-client-call",
        path: "src/imports.ts",
        line: 9,
        column: 1,
        module: "example-client",
        apiPath: ["default", "get"],
        kind: "call",
      },
      {
        id: "shadowed-read-safe",
        path: "src/imports.ts",
        line: 10,
        column: 46,
        module: "globalThis",
        apiPath: ["read"],
        kind: "call",
      },
      {
        id: "type-only-export",
        path: "src/imports.ts",
        line: 5,
        column: 1,
        module: "example-client",
        apiPath: ["Client"],
        kind: "call",
      },
    ],
  };
  const apiCasesText =
    JSON.stringify(apiCases, null, 2) + String.fromCharCode(10);
  writeFileSync(join(apiDir, "cases.json"), apiCasesText);
  const rulesText = readFileSync(
    "data/rules/harmonyos-6.0-api20-rules.json",
    "utf8",
  );
  const apiPreds = await predictIncompatibleApis(
    "fixtures/developer/source-api",
    apiCasesText,
    rulesText,
  );
  const apiLabels = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-incompatible-api",
    origin: "developer-fixture",
    provenance: {
      source: "audited-holdout",
      license: "MIT",
      labelAuthor: "Claude Code",
      sdk: "HarmonyOS 6.0.0 (API 20)",
      target: "6.0.0",
    },
    binding: apiPreds.binding,
    cases: [
      {
        id: "node-fs-call",
        category: "incompatible-api",
        expected: "positive",
      },
      {
        id: "node-fsp-call",
        category: "incompatible-api",
        expected: "positive",
      },
      {
        id: "example-client-call",
        category: "incompatible-api",
        expected: "negative",
      },
      {
        id: "shadowed-read-safe",
        category: "incompatible-api",
        expected: "negative",
      },
      {
        id: "type-only-export",
        category: "incompatible-api",
        expected: "negative",
      },
    ],
  };
  const apiLabelsText =
    JSON.stringify(apiLabels, null, 2) + String.fromCharCode(10);
  writeFileSync(join(apiDir, "labels.json"), apiLabelsText);
  const apiPredsText =
    JSON.stringify(apiPreds, null, 2) + String.fromCharCode(10);
  writeFileSync(join(apiDir, "predictions.json"), apiPredsText);
  const apiRes = evaluate(apiLabelsText, apiPredsText);
  writeFileSync(
    join(apiDir, "results.json"),
    JSON.stringify(apiRes, null, 2) + String.fromCharCode(10),
  );
  console.log("Incompatible API results:", apiRes.total);

  // 3. Replacement Mapping
  const repDir = join(base, "replacement-mapping");
  mkdirSync(repDir, { recursive: true });
  const repCases = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-replacement-mapping",
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
  };
  const repCasesText =
    JSON.stringify(repCases, null, 2) + String.fromCharCode(10);
  writeFileSync(join(repDir, "cases.json"), repCasesText);
  const snapshotText = readFileSync(
    "data/knowledge/reviewed-provenance-snapshot.json",
    "utf8",
  );
  const asOf = "2026-11-13T00:00:00Z";
  const repPreds = predictReplacements(repCasesText, snapshotText, asOf);
  const repLabels = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-replacement-mapping",
    origin: "developer-fixture",
    provenance: {
      source: "audited-holdout",
      license: "MIT",
      labelAuthor: "Claude Code",
      sdk: "HarmonyOS 6.0.0 (API 20)",
      target: "6.0.0",
    },
    binding: repPreds.binding,
    cases: [
      {
        id: "axios-ohpm-ok",
        category: "replacement-mapping",
        expected: "positive",
      },
      {
        id: "axios-excluded-gap",
        category: "replacement-mapping",
        expected: "negative",
      },
      {
        id: "axios-wrong-target",
        category: "replacement-mapping",
        expected: "negative",
      },
      {
        id: "sharp-missing",
        category: "replacement-mapping",
        expected: "negative",
      },
      {
        id: "dayjs-pure",
        category: "replacement-mapping",
        expected: "negative",
      },
      {
        id: "zod-unknown",
        category: "replacement-mapping",
        expected: "negative",
      },
    ],
  };
  const repLabelsText =
    JSON.stringify(repLabels, null, 2) + String.fromCharCode(10);
  writeFileSync(join(repDir, "labels.json"), repLabelsText);
  const repPredsText =
    JSON.stringify(repPreds, null, 2) + String.fromCharCode(10);
  writeFileSync(join(repDir, "predictions.json"), repPredsText);
  const repRes = evaluate(repLabelsText, repPredsText);
  writeFileSync(
    join(repDir, "results.json"),
    JSON.stringify(repRes, null, 2) + String.fromCharCode(10),
  );
  console.log("Replacement mapping results:", repRes.total);

  // 4. Missing Port
  const missDir = join(base, "missing-port");
  mkdirSync(missDir, { recursive: true });
  const missCases = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-missing-port",
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
      { id: "crypto-js", package: "crypto-js", version: "4.2.0" },
    ],
  };
  const missCasesText =
    JSON.stringify(missCases, null, 2) + String.fromCharCode(10);
  writeFileSync(join(missDir, "cases.json"), missCasesText);
  const missPreds = predictMissingPorts(missCasesText, snapshotText, asOf);
  const missLabels = {
    schemaVersion: "0.1.0",
    datasetId: "acceptance-missing-port",
    origin: "developer-fixture",
    provenance: {
      source: "audited-holdout",
      license: "MIT",
      labelAuthor: "Claude Code",
      sdk: "HarmonyOS 6.0.0 (API 20)",
      target: "6.0.0",
    },
    binding: missPreds.binding,
    cases: [
      { id: "sharp", category: "missing-port", expected: "positive" },
      { id: "axios", category: "missing-port", expected: "negative" },
      { id: "iabtcf", category: "missing-port", expected: "negative" },
      { id: "dayjs", category: "missing-port", expected: "negative" },
      { id: "zod", category: "missing-port", expected: "negative" },
      { id: "crypto-js", category: "missing-port", expected: "negative" },
    ],
  };
  const missLabelsText =
    JSON.stringify(missLabels, null, 2) + String.fromCharCode(10);
  writeFileSync(join(missDir, "labels.json"), missLabelsText);
  const missPredsText =
    JSON.stringify(missPreds, null, 2) + String.fromCharCode(10);
  writeFileSync(join(missDir, "predictions.json"), missPredsText);
  const missRes = evaluate(missLabelsText, missPredsText);
  writeFileSync(
    join(missDir, "results.json"),
    JSON.stringify(missRes, null, 2) + String.fromCharCode(10),
  );
  console.log("Missing port results:", missRes.total);

  // Write manifests and SHA256SUMS for all four
  for (const dir of [depDir, apiDir, repDir, missDir]) {
    const files = [
      "cases.json",
      "labels.json",
      "predictions.json",
      "results.json",
    ];
    const hashes = {};
    for (const f of files) {
      hashes[f] = sha256(readFileSync(join(dir, f), "utf8"));
    }
    const manifest = {
      schemaVersion: "0.1.0",
      acceptance: "not-adjudicated",
      independence: "unverified",
      files: hashes,
    };
    const manifestText =
      JSON.stringify(manifest, null, 2) + String.fromCharCode(10);
    writeFileSync(join(dir, "manifest.json"), manifestText);
    const allHashes = { ...hashes, "manifest.json": sha256(manifestText) };
    const shaSums = Object.entries(allHashes)
      .map(([name, hash]) => hash + "  " + name + String.fromCharCode(10))
      .join("");
    writeFileSync(join(dir, "SHA256SUMS"), shaSums);
  }
  console.log("Successfully generated all four benchmark domains!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

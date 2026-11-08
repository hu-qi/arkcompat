import { execFileSync } from "node:child_process";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  predictRootDependencies,
  evaluate,
  sha256,
} from "../packages/evaluation/src/index.js";

const casesPath = "fixtures/developer/dependency-evaluation/cases.json";
const labelsPath = "fixtures/developer/dependency-evaluation/labels.json";
const project = "fixtures/developer/inventory";
const caseText = await readFile(casesPath, "utf8");

it("generates label-blind predictions with exact case and report hashes", async () => {
  const generated = await predictRootDependencies(project, caseText);
  const report = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      project,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
  expect(generated).toMatchObject({
    binding: {
      scope: "root-declaration-presence",
      casesSha256: sha256(caseText),
      scanReportSha256: sha256(report),
    },
    predictions: [
      { id: "present", actual: "positive" },
      { id: "wrong-section", actual: "negative" },
      { id: "absent", actual: "negative" },
    ],
  });
  expect(JSON.stringify(generated)).not.toContain("example-library");
});
it.each([
  "duplicate-id",
  "duplicate-selector",
  "embedded-label",
  "invalid-path",
  "bad-target",
  "oversized",
  "malformed",
])("rejects %s case input", async (kind) => {
  const data = JSON.parse(caseText);
  const first = data.cases[0];
  if (kind === "duplicate-id") data.cases[1].id = first.id;
  if (kind === "duplicate-selector")
    data.cases.push({ ...first, id: "duplicate" });
  if (kind === "embedded-label") first.expected = "positive";
  if (kind === "invalid-path") first.name = "../private";
  if (kind === "bad-target") data.target.apiLevel = 0;
  const input =
    kind === "oversized"
      ? " ".repeat(2 * 1024 * 1024 + 1)
      : kind === "malformed"
        ? "{"
        : JSON.stringify(data);
  await expect(predictRootDependencies(project, input)).rejects.toThrow(
    /Invalid dependency prediction cases/,
  );
});
it("does not turn failed scans into all-negative predictions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arkcompat-deps-predict-"));
  try {
    await writeFile(join(dir, "package.json"), "{");
    await expect(predictRootDependencies(dir, caseText)).rejects.toThrow(
      /scan failed/i,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("passes actual CLI predictions to the evaluator without claiming acceptance", async () => {
  const actual = execFileSync(
    process.execPath,
    ["apps/evaluate/dist/index.js", "predict-dependencies", project, casesPath],
    { encoding: "utf8" },
  );
  const labels = await readFile(labelsPath, "utf8");
  expect(evaluate(labels, actual)).toMatchObject({
    acceptance: "not-adjudicated",
    independence: "unverified",
    recordedScanner: { binding: { scope: "root-declaration-presence" } },
    total: { labeled: 3, tp: 1, tn: 2, fp: 0, fn: 0 },
  });
});

it("does not score bound root declaration predictions as another category", async () => {
  const predictions = await predictRootDependencies(project, caseText);
  const labels = JSON.parse(await readFile(labelsPath, "utf8"));
  labels.cases[0].category = "replacement";
  expect(() =>
    evaluate(JSON.stringify(labels), JSON.stringify(predictions)),
  ).toThrow(/Invalid evaluation inputs/);
});

it("supports the scanner's optional API level without changing declaration scope", async () => {
  const data = JSON.parse(caseText);
  delete data.target.apiLevel;
  const result = await predictRootDependencies(project, JSON.stringify(data));
  expect(result.predictions[0]).toEqual({ id: "present", actual: "positive" });
});

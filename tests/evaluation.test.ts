import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { evaluate } from "../packages/evaluation/src/index.js";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => rm(r, { recursive: true, force: true })),
  );
});
function labels() {
  return {
    schemaVersion: "0.1.0",
    datasetId: "developer-fixture",
    origin: "developer-fixture",
    provenance: {
      source: "authored-fixture",
      license: "LicenseRef-DeveloperFixture",
      labelAuthor: "synthetic-fixture-author",
      sdk: "not-runtime-verified",
      target: "synthetic-target-context",
    },
    cases: [
      { id: "positive", category: "api", expected: "positive" },
      { id: "negative", category: "api", expected: "negative" },
    ],
  };
}
function predictions() {
  return {
    schemaVersion: "0.1.0",
    datasetId: "developer-fixture",
    scannerVersion: "0.0.0",
    rulesSnapshot: "none",
    knowledgeSnapshot: "none",
    predictions: [
      { id: "positive", actual: "positive" },
      { id: "negative", actual: "negative" },
    ],
  };
}
const json = (x: unknown) => JSON.stringify(x);
it("reports descriptive counts without declaring acceptance or independent provenance", () => {
  const r = evaluate(json(labels()), json(predictions()));
  expect({
    acceptance: r.acceptance,
    independence: r.independence,
    total: r.total,
    group: r.categories,
  }).toMatchObject({
    acceptance: "not-adjudicated",
    independence: "unverified",
    total: {
      labeled: 2,
      tp: 1,
      fp: 0,
      fn: 0,
      tn: 1,
      abstained: 0,
      precision: 1,
      recall: 1,
      accuracy: 1,
    },
    group: { api: { labeled: 2 } },
  });
});
it("counts abstained positives as misses and does not turn no recommendations into100% precision", () => {
  const p = predictions();
  p.predictions = [];
  const r = evaluate(json(labels()), json(p));
  expect(r.total).toEqual({
    labeled: 2,
    positive: 1,
    negative: 1,
    tp: 0,
    fp: 0,
    fn: 1,
    tn: 0,
    abstained: 2,
    abstainedPositive: 1,
    abstainedNegative: 1,
    missingPredictions: 2,
    precision: null,
    recall: 0,
    accuracy: 0,
    coverage: 0,
    falsePositiveRate: 0,
  });
});
it("handles mixed errors, explicit unknowns and category denominators", () => {
  const l = labels();
  l.cases.push({ id: "other", category: "dependency", expected: "positive" });
  const p = predictions();
  p.predictions = [
    { id: "positive", actual: "negative" },
    { id: "negative", actual: "positive" },
    { id: "other", actual: "unknown" },
  ];
  const r = evaluate(json(l), json(p));
  expect({ total: r.total, groups: r.categories }).toMatchObject({
    total: {
      labeled: 3,
      tp: 0,
      fp: 1,
      fn: 2,
      tn: 0,
      abstained: 1,
      missingPredictions: 0,
      coverage: 2 / 3,
      recall: 0,
    },
    groups: {
      api: { fp: 1, fn: 1 },
      dependency: { labeled: 1, abstainedPositive: 1 },
    },
  });
});
it("keeps empty datasets unscored instead of passing vacuously", () => {
  const l = labels();
  l.cases = [];
  const p = predictions();
  p.predictions = [];
  expect(evaluate(json(l), json(p))).toMatchObject({
    total: {
      labeled: 0,
      precision: null,
      recall: null,
      accuracy: null,
      coverage: null,
      falsePositiveRate: null,
    },
    categories: {},
    acceptance: "not-adjudicated",
  });
});
it.each([
  "duplicate-label",
  "duplicate-prediction",
  "extra-prediction",
  "dataset-mismatch",
  "invalid-status",
  "invalid-origin",
  "false-approval",
])("rejects ambiguous/invalid evaluation data: %s", (kind) => {
  const l = labels();
  const p = predictions();
  if (kind === "duplicate-label") l.cases.push({ ...l.cases[0]! });
  if (kind === "duplicate-prediction")
    p.predictions.push({ ...p.predictions[0]! });
  if (kind === "extra-prediction")
    p.predictions.push({ id: "unexpected", actual: "positive" });
  if (kind === "dataset-mismatch") p.datasetId = "different";
  if (kind === "invalid-status") p.predictions[0]!.actual = "compatible";
  if (kind === "invalid-origin") l.origin = "independently-accepted";
  if (kind === "false-approval") Reflect.set(l, "approved", true);
  expect(() => evaluate(json(l), json(p))).toThrow(
    "Invalid evaluation inputs.",
  );
});
it("rejects malformed/oversize inputs and invalid categories without echoing private fields", () => {
  for (const value of [
    "PRIVATE_TOKEN",
    "null",
    " ".repeat(2 * 1024 * 1024 + 1),
  ])
    expect(() => evaluate(value, json(predictions()))).toThrow(
      "Invalid evaluation inputs.",
    );
  const l = labels();
  l.cases[0]!.category = "<PRIVATE_TOKEN>";
  expect(() => evaluate(json(l), json(predictions()))).toThrow(
    "Invalid evaluation inputs.",
  );
});
it("preserves externally supplied provenance as unverified and hashes exact input bytes", () => {
  const l = labels();
  l.origin = "external-unverified";
  const labelText = json(l) + "\n";
  const predictionText = json(predictions());
  const r = evaluate(labelText, predictionText);
  expect({
    origin: r.origin,
    independence: r.independence,
    hashes: r.inputs,
  }).toEqual({
    origin: "external-unverified",
    independence: "unverified",
    hashes: {
      labelsSha256: createHash("sha256").update(labelText).digest("hex"),
      predictionsSha256: createHash("sha256")
        .update(predictionText)
        .digest("hex"),
    },
  });
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-evaluation-"));
  roots.push(root);
  await writeFile(join(root, "labels.json"), json(labels()));
  await writeFile(join(root, "predictions.json"), json(predictions()));
  return root;
}
function run(root: string, out = "evidence") {
  return spawnSync(
    process.execPath,
    [
      "apps/evaluate/dist/index.js",
      join(root, "labels.json"),
      join(root, "predictions.json"),
      join(root, out),
    ],
    { encoding: "utf8", timeout: 3000 },
  );
}
it("creates hash-verifiable artifacts and never overwrites an existing evidence directory", async () => {
  const root = await fixture();
  const first = run(root);
  expect({
    status: first.status,
    error: first.stderr,
    files: (await readdir(join(root, "evidence"))).sort(),
  }).toEqual({
    status: 0,
    error: "",
    files: [
      "SHA256SUMS",
      "labels.json",
      "manifest.json",
      "predictions.json",
      "results.json",
    ],
  });
  const manifest = JSON.parse(
    await readFile(join(root, "evidence/manifest.json"), "utf8"),
  ) as { files: Record<string, string> };
  for (const [file, hash] of Object.entries(manifest.files))
    expect(
      createHash("sha256")
        .update(await readFile(join(root, "evidence", file)))
        .digest("hex"),
    ).toBe(hash);
  const hashes = await readFile(join(root, "evidence/SHA256SUMS"), "utf8");
  expect(hashes).toContain(
    createHash("sha256")
      .update(await readFile(join(root, "evidence/manifest.json")))
      .digest("hex") + "  manifest.json",
  );
  expect(run(root).status).toBe(1);
});
it("reproduces identical artifacts without wall-clock/absolute path noise", async () => {
  const root = await fixture();
  run(root, "one");
  run(root, "two");
  for (const file of await readdir(join(root, "one")))
    expect(await readFile(join(root, "one", file), "utf8")).toBe(
      await readFile(join(root, "two", file), "utf8"),
    );
});
it("rejects symlink/oversize input files and keeps path/source errors off stdout", async () => {
  const root = await fixture();
  await symlink("labels.json", join(root, "linked.json"));
  const linked = spawnSync(
    process.execPath,
    [
      "apps/evaluate/dist/index.js",
      join(root, "linked.json"),
      join(root, "predictions.json"),
      join(root, "out"),
    ],
    { encoding: "utf8", timeout: 3000 },
  );
  expect({
    status: linked.status,
    output: linked.stdout,
    pathLeak: linked.stderr.includes(root),
  }).toEqual({ status: 1, output: "", pathLeak: false });
  await writeFile(join(root, "labels.json"), " ".repeat(2 * 1024 * 1024 + 1));
  expect(run(root).status).toBe(1);
});
it("documents usage through the actual built command", () => {
  expect(
    execFileSync(process.execPath, ["apps/evaluate/dist/index.js", "--help"], {
      encoding: "utf8",
    }),
  ).toContain("<labels.json> <predictions.json> <new-output-directory>");
});

it("rejects whitespace provenance and more than10000 labeled units", () => {
  const l = labels();
  l.provenance.sdk = "   ";
  expect(() => evaluate(json(l), json(predictions()))).toThrow(
    "Invalid evaluation inputs.",
  );
  l.provenance.sdk = "not-runtime-verified";
  l.cases = Array.from({ length: 10001 }, (_, i) => ({
    id: `case${i}`,
    category: "api",
    expected: "positive",
  }));
  expect(() => evaluate(json(l), json(predictions()))).toThrow(
    "Invalid evaluation inputs.",
  );
});

it("rejects invalid UTF-8 bytes so artifact hashes describe the actual input files", async () => {
  const root = await fixture();
  await writeFile(join(root, "labels.json"), Buffer.from([0xff]));
  expect(run(root).status).toBe(1);
});

it("reproduces the documented all-unknown developer fixture with zero acceptance claims", async () => {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-evaluation-demo-"));
  roots.push(root);
  const cli = spawnSync(
    process.execPath,
    [
      "apps/evaluate/dist/index.js",
      "fixtures/developer/evaluation/labels.json",
      "fixtures/developer/evaluation/predictions.json",
      join(root, "evidence"),
    ],
    { encoding: "utf8", timeout: 3000 },
  );
  const report = JSON.parse(
    await readFile(join(root, "evidence/results.json"), "utf8"),
  );
  expect({
    code: cli.status,
    total: report.total,
    acceptance: report.acceptance,
  }).toMatchObject({
    code: 0,
    total: {
      labeled: 3,
      fn: 2,
      abstained: 3,
      precision: null,
      coverage: 0,
      recall: 0,
      accuracy: 0,
    },
    acceptance: "not-adjudicated",
  });
});

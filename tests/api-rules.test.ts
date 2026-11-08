import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { evaluateApiRules, scanProject } from "@arkcompat/core";
import type { ApiUsage, TargetProfile } from "@arkcompat/contracts";

const fixture = "fixtures/developer/api-rules/snapshot.json";
const snapshot = await readFile(fixture, "utf8");
const target: TargetProfile = {
  os: "HarmonyOS",
  runtime: "arkts",
  release: "6.0.0",
  apiLevel: 20,
};
const usage: ApiUsage = {
  module: "demo-library",
  path: ["sample"],
  kind: "call",
  optional: false,
  location: { path: "main.ts", line: 2, column: 1 },
};
const roots: string[] = [];
async function sample() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-api-rules-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), "{}");
  await writeFile(
    join(root, "main.ts"),
    'import { sample } from "demo-library";\nsample();\n',
  );
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const run = (profile = target, apiUsages = [usage], text = snapshot) =>
  evaluateApiRules({ target: profile, apiUsages }, text);

it("records exact static evidence, the snapshot hash and the denominator", () => {
  const result = run(target, [usage, { ...usage, module: "other-library" }]);
  expect(result).toMatchObject({
    snapshot: {
      id: "developer-static-example",
      sha256: createHash("sha256").update(snapshot).digest("hex"),
    },
    counts: { observed: 2, potentialRisk: 1, unknown: 1 },
    results: [
      {
        usage,
        status: "potential-risk",
        tier: "rule-static",
        ruleId: "demo.sample-call",
        source: { revision: "developer-fixture" },
      },
      { status: "unknown", reason: "no-exact-rule" },
    ],
  });
  expect(run(target, [usage, { ...usage, module: "other-library" }])).toEqual(
    result,
  );
});
it.each([
  { ...target, runtime: "arkweb" as const },
  { ...target, release: "6.0.1" },
  { ...target, apiLevel: 21 },
])("abstains on unmatched target %j", (profile) => {
  expect(run(profile).results[0]).toMatchObject({
    status: "unknown",
    reason: "no-exact-rule",
  });
});
it("keeps an empty observation set explicit", () => {
  expect(run(target, []).counts).toEqual({
    observed: 0,
    potentialRisk: 0,
    unknown: 0,
  });
});
it("requires an explicit API level", () => {
  expect(
    run({ os: "HarmonyOS", runtime: "arkts", release: "6.0.0" }).results[0],
  ).toMatchObject({
    status: "unknown",
    reason: "missing-api-level",
  });
});
it.each([
  { ...usage, kind: "construct" as const },
  { ...usage, path: ["sample", "nested"] },
  { ...usage, module: "demo-library/subpath" },
])("does not generalize a selector match to %j", (observed) => {
  expect(run(target, [observed]).results[0]).toMatchObject({
    status: "unknown",
    reason: "no-exact-rule",
  });
});
it("withholds ambiguous rules independent of their order", () => {
  const data = JSON.parse(snapshot);
  const a = data.rules[0];
  const b = { ...a, id: "demo.overlap" };
  for (const rules of [
    [a, b],
    [b, a],
  ]) {
    expect(
      run(target, [usage], JSON.stringify({ ...data, rules })).results[0],
    ).toMatchObject({
      status: "unknown",
      reason: "ambiguous-rule",
    });
  }
});
it.each(["{", "[]", " ".repeat(1024 * 1024 + 1)])(
  "rejects invalid rule input %#",
  (text) => {
    expect(() => run(target, [usage], text)).toThrow(/rule snapshot/i);
  },
);
it("rejects duplicate IDs even for different profiles", () => {
  const data = JSON.parse(snapshot);
  data.rules.push({
    ...data.rules[0],
    profile: { ...data.rules[0].profile, apiLevel: 21 },
  });
  expect(() => run(target, [usage], JSON.stringify(data))).toThrow(
    /duplicate/i,
  );
});
it("rejects verified-state assertions and unsafe evidence URLs", () => {
  const data = JSON.parse(snapshot);
  const first = data.rules[0];
  for (const rule of [
    { ...first, status: "verified-incompatible" },
    {
      ...first,
      source: {
        ...first.source,
        url: "https://user:secret@example.invalid/path",
      },
    },
    {
      ...first,
      source: {
        ...first.source,
        url: "https://example.invalid/path?token=secret",
      },
    },
  ]) {
    expect(() =>
      run(target, [usage], JSON.stringify({ ...data, rules: [rule] })),
    ).toThrow(/rule snapshot/i);
  }
});
const cli = "apps/cli/dist/index.js";
const args = ["--runtime", "arkts", "--release", "6.0.0", "--api-level", "20"];
it("uses the same evaluator in the opt-in CLI and preserves default inventory", async () => {
  const root = await sample();
  const report = await scanProject(root, target);
  const before = execFileSync(process.execPath, [cli, "scan", root, ...args], {
    encoding: "utf8",
  });
  const actual = execFileSync(
    process.execPath,
    [cli, "api-rules", root, ...args, "--rules", fixture],
    { encoding: "utf8" },
  );
  expect(JSON.parse(actual)).toEqual(evaluateApiRules(report, snapshot));
  expect(JSON.parse(before)).toEqual(report);
  expect(report.findings.every((finding) => finding.status === "unknown")).toBe(
    true,
  );
});
it("evaluates the canonical namespace path from a destructured alias end to end", async () => {
  const root = await sample();
  await writeFile(
    join(root, "main.ts"),
    'import * as api from "demo-library";\nconst { sample: send } = api;\nsend();\n',
  );
  const input = JSON.parse(snapshot);
  input.rules[0].selector.path = ["*", "sample"];
  const rulePath = join(root, "rules.json");
  await writeFile(rulePath, JSON.stringify(input));
  const actual = execFileSync(
    process.execPath,
    [cli, "api-rules", root, ...args, "--rules", rulePath],
    { encoding: "utf8" },
  );
  expect(JSON.parse(actual)).toMatchObject({
    counts: { observed: 1, potentialRisk: 1, unknown: 0 },
    results: [
      {
        status: "potential-risk",
        ruleId: "demo.sample-call",
        usage: {
          path: ["*", "sample"],
          location: { path: "main.ts", line: 3, column: 1 },
        },
      },
    ],
  });
});
it("rejects missing, symlink, oversized and non-UTF8 rule inputs without printing paths or data", async () => {
  const root = await sample();
  const privatePath = join(root, "private-rule.json");
  await symlink(join(process.cwd(), fixture), privatePath);
  const invoke = (file: string) =>
    spawnSync(
      process.execPath,
      [cli, "api-rules", root, ...args, "--rules", file],
      { encoding: "utf8" },
    );
  for (const bytes of [
    null,
    Buffer.alloc(1024 * 1024 + 1),
    Buffer.from([0xff]),
  ]) {
    if (bytes) {
      await rm(privatePath, { force: true });
      await writeFile(privatePath, bytes);
    }
    const result = invoke(privatePath);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toContain(privatePath);
  }
  expect(invoke(join(root, "missing-secret.json")).stderr).not.toContain(root);
});

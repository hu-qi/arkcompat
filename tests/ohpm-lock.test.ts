import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Ajv } from "ajv";
import { afterEach, expect, it } from "vitest";
import { scanProject } from "@arkcompat/core";
import { parseReport } from "../apps/web/src/model.js";
import type { TargetProfile } from "@arkcompat/contracts";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};
const roots: string[] = [];
async function fixture(manifest: unknown, lock: unknown) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-ohpm-lock-"));
  roots.push(root);
  await writeFile(join(root, "oh-package.json5"), JSON.stringify(manifest));
  await writeFile(join(root, "oh-package-lock.json5"), JSON.stringify(lock));
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const registry = { registryType: "ohpm" };
const lock = {
  lockfileVersion: 3,
  meta: { enableUnifiedLockfile: false },
  specifiers: {
    "@fixture/outer@^1.0.0": "@fixture/outer@1.2.0",
    "child@2.0.0": "child@2.0.0",
    "stale@1.0.0": "stale@1.0.0",
  },
  packages: {
    "@fixture/outer@1.2.0": {
      ...registry,
      name: "@fixture/outer",
      version: "1.2.0",
      resolved: "https://example.invalid/tarball?token=private",
      dependencies: { child: "2.0.0" },
    },
    "child@2.0.0": { ...registry, name: "child" },
    "stale@1.0.0": { ...registry, name: "stale", version: "1.0.0" },
  },
};
it("uses exact OHPM selectors for direct and transitive edges with CLI/schema parity", async () => {
  const root = await fixture(
    { dependencies: { "@fixture/outer": "^1.0.0", stale: "^1.0.0" } },
    lock,
  );
  const report = await scanProject(root, target);
  expect(report.schemaVersion).toBe("0.9.0");
  expect(report.coverage.dependencyGraph).toBe("ohpm-lockfile-partial");
  expect(report.dependencyGraph).toMatchObject({
    source: "oh-package-lock.json5",
    lockfileVersion: 3,
    nodes: [
      { id: "@fixture/outer@1.2.0", name: "@fixture/outer", version: "1.2.0" },
      { id: "child@2.0.0", name: "child", version: "2.0.0" },
      { id: "stale@1.0.0", name: "stale", version: "1.0.0" },
    ],
    edges: [
      {
        from: "",
        name: "@fixture/outer",
        to: "@fixture/outer@1.2.0",
        resolution: "locked",
      },
      { from: "", name: "stale", to: null, resolution: "missing" },
      {
        from: "@fixture/outer@1.2.0",
        name: "child",
        to: "child@2.0.0",
        resolution: "locked",
      },
    ],
  });
  expect(JSON.stringify(report)).not.toContain("token=private");
  expect(report.findings.every((finding) => finding.status === "unknown")).toBe(
    true,
  );
  const cli = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      root,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
  expect(parseReport(cli)).toEqual(report);
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  expect(new Ajv().compile(schema)(report)).toBe(true);
});
it("preserves a local HAR version without exporting or opening its path", async () => {
  const path = "../private/name.har";
  const key = "local@" + path;
  const root = await fixture(
    { dependencies: { local: "file:" + path } },
    {
      lockfileVersion: 3,
      specifiers: { [key]: key },
      packages: {
        [key]: {
          registryType: "local",
          name: "local",
          version: "2.0.0",
          resolved: path,
        },
      },
    },
  );
  const report = await scanProject(root, target);
  const [node] = report.dependencyGraph.nodes;
  expect(node).toMatchObject({ name: "local", version: "2.0.0", link: true });
  expect(report.dependencyGraph.edges).toMatchObject([
    { to: node?.id, resolution: "unsupported", specifier: "[local-reference]" },
  ]);
  expect(JSON.stringify(report)).not.toContain("private/name.har");
});
it.each([
  { ...lock, lockfileVersion: 4 },
  { ...lock, meta: { enableUnifiedLockfile: true } },
])("does not interpret unsupported/unified layouts", async (input) => {
  const report = await scanProject(
    await fixture({ dependencies: { "@fixture/outer": "^1.0.0" } }, input),
    target,
  );
  expect(report.coverage.dependencyGraph).toBe("declarations-only");
  expect(report.dependencyGraph.edges).toEqual([]);
  expect(report.dependencies).toHaveLength(1);
});
it.each([
  { ...lock, specifiers: [] },
  { ...lock, specifiers: { wrong: false } },
  {
    ...lock,
    packages: {
      "child@2.0.0": { ...registry, name: "child", version: "3.0.0" },
    },
  },
])("fails closed on malformed v3 metadata", async (input) => {
  await expect(scanProject(await fixture({}, input), target)).rejects.toThrow(
    /oh-package-lock.json5/,
  );
});
it("does not attach an alias descriptor to the wrong package", async () => {
  const root = await fixture(
    { dependencies: { alias: "^1.0.0" } },
    { ...lock, specifiers: { "alias@^1.0.0": "@fixture/outer@1.2.0" } },
  );
  const report = await scanProject(root, target);
  expect(report.dependencyGraph.edges[0]).toMatchObject({
    name: "alias",
    to: null,
    resolution: "unsupported",
  });
});

it("records dynamic and unrecognized package data as limitations", async () => {
  const root = await fixture(
    { dependencies: { foreign: "1.0.0", local: "../private/other.har" } },
    {
      lockfileVersion: 3,
      specifiers: { "foreign@1.0.0": "foreign@1.0.0" },
      packages: {
        "foreign@1.0.0": { name: "foreign", registryType: "other" },
        "child@2.0.0": {
          ...registry,
          name: "child",
          dynamicDependencies: { feature: "1.0.0" },
        },
      },
    },
  );
  const report = await scanProject(root, target);
  expect(
    report.dependencyGraph.edges.map(({ resolution, to }) => [resolution, to]),
  ).toEqual([
    ["unsupported", null],
    ["unsupported", null],
  ]);
  expect(report.coverage.limitations.map(({ code }) => code)).toEqual(
    expect.arrayContaining([
      "ohpm-package-record-not-analyzed",
      "ohpm-dynamic-dependencies-not-analyzed",
    ]),
  );
  expect(JSON.stringify(report)).not.toContain("private/other.har");
});
it("rejects invalid JSON5 or lock versions without exposing payload", async () => {
  for (const text of ["{not-valid", "[]", "{lockfileVersion:0}"]) {
    const root = await fixture({}, lock);
    await writeFile(join(root, "oh-package-lock.json5"), text);
    await expect(scanProject(root, target)).rejects.toThrow(
      /^oh-package-lock.json5:/,
    );
  }
});

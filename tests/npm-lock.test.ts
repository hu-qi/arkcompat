import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { Ajv } from "ajv";
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";
const target: TargetProfile = {
  os: "HarmonyOS",
  runtime: "arkts",
  release: "6.0.0",
};
const roots: string[] = [];
async function fixture(
  packages: Record<string, unknown>,
  manifest: unknown = {},
  version = 3,
) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-npm-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify({
      lockfileVersion: version,
      packages: { "": manifest, ...packages },
    }),
  );
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it.each([2, 3])(
  "extracts npm v%i direct and transitive edges with nested and hoisted versions",
  async (version) => {
    const root = await fixture(
      {
        "node_modules/a": {
          version: "1.0.0",
          dependencies: { shared: "^1", b: "^1" },
        },
        "node_modules/a/node_modules/shared": { version: "1.1.0" },
        "node_modules/b": { version: "1.0.0", dependencies: { shared: "^2" } },
        "node_modules/shared": { version: "2.0.0" },
      },
      { dependencies: { a: "^1", b: "^1" } },
      version,
    );
    const report = await scanProject(root, target);
    expect(
      report.dependencyGraph.edges.map((e) => [
        e.from,
        e.name,
        e.to,
        e.resolution,
      ]),
    ).toEqual([
      ["", "a", "node_modules/a", "locked"],
      ["", "b", "node_modules/b", "locked"],
      ["node_modules/a", "b", "node_modules/b", "locked"],
      [
        "node_modules/a",
        "shared",
        "node_modules/a/node_modules/shared",
        "locked",
      ],
      ["node_modules/b", "shared", "node_modules/shared", "locked"],
    ]);
  },
);
it("retains scoped install names and alias package identity without merging versions", async () => {
  const root = await fixture(
    { "node_modules/@scope/alias": { name: "real-library", version: "2.1.0" } },
    { dependencies: { "@scope/alias": "npm:real-library@^2" } },
  );
  const report = await scanProject(root, target);
  expect(report.dependencyGraph.nodes).toEqual([
    {
      id: "node_modules/@scope/alias",
      installName: "@scope/alias",
      name: "real-library",
      version: "2.1.0",
      link: false,
    },
  ]);
});
it("resolves peer dependencies from the parent rather than a private child", async () => {
  const root = await fixture(
    {
      "node_modules/a": { version: "1.0.0", peerDependencies: { peer: "^1" } },
      "node_modules/a/node_modules/peer": { version: "2.0.0" },
      "node_modules/peer": { version: "1.0.0" },
    },
    { dependencies: { a: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges.find(
      (e) => e.from === "node_modules/a",
    )?.to,
  ).toBe("node_modules/peer");
});
it("preserves missing, optional, peer and unsupported workspace edges", async () => {
  const root = await fixture(
    {
      "node_modules/a": {
        version: "1.0.0",
        optionalDependencies: { optional: "*" },
        peerDependencies: { peer: "^1" },
      },
      "node_modules/local": { link: true, resolved: "packages/local" },
      "packages/local": { version: "1.0.0" },
    },
    { dependencies: { a: "^1", local: "workspace:*", missing: "^1" } },
  );
  const graph = (await scanProject(root, target)).dependencyGraph;
  expect(graph.edges.map((e) => [e.name, e.section, e.resolution])).toEqual([
    ["a", "dependencies", "locked"],
    ["local", "dependencies", "unsupported"],
    ["missing", "dependencies", "missing"],
    ["optional", "optionalDependencies", "missing"],
    ["peer", "peerDependencies", "missing"],
  ]);
});
it("uses shrinkwrap before package-lock even if the ignored package-lock is invalid", async () => {
  const root = await fixture({});
  await writeFile(join(root, "package-lock.json"), "{");
  await writeFile(
    join(root, "npm-shrinkwrap.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "": {}, "node_modules/only": { version: "1.0.0" } },
    }),
  );
  expect((await scanProject(root, target)).dependencyGraph.source).toBe(
    "npm-shrinkwrap.json",
  );
});
it("reports a missing npm lockfile without claiming transitive completeness", async () => {
  const root = await fixture({});
  await rm(join(root, "package-lock.json"));
  const report = await scanProject(root, target);
  expect({
    graph: report.dependencyGraph,
    coverage: report.coverage.dependencyGraph,
  }).toEqual({
    graph: { source: null, lockfileVersion: null, nodes: [], edges: [] },
    coverage: "declarations-only",
  });
});
it("reports unsupported v1 as unparsed rather than silently treating it as v3", async () => {
  const report = await scanProject(await fixture({}, {}, 1), target);
  expect(report.coverage.limitations.map((l) => l.code)).toContain(
    "unsupported-npm-lockfile-version",
  );
});
it("flags stale root declarations and does not pretend version ranges were checked", async () => {
  const root = await fixture(
    { "node_modules/a": { version: "1.0.0" } },
    { dependencies: { a: "^1" } },
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { a: "^9" } }),
  );
  expect(
    (await scanProject(root, target)).coverage.limitations.map((l) => l.code),
  ).toEqual(
    expect.arrayContaining([
      "manifest-lockfile-mismatch",
      "dependency-ranges-not-validated",
    ]),
  );
});
it.each([
  "{",
  "null",
  '{"lockfileVersion":3}',
  '{"lockfileVersion":3,"packages":[]}',
  '{"lockfileVersion":3,"packages":{"":{},"node_modules/a":{"version":42}}}',
  '{"lockfileVersion":3,"packages":{"":{},"node_modules/../../escape":{"version":"1.0.0"}}}',
  '{"lockfileVersion":3,"packages":{"":{},"node_modules/a":{"dependencies":[]}}}',
])("fails on malformed/unsafe npm lock input %s", async (text) => {
  const root = await fixture({});
  await writeFile(join(root, "package-lock.json"), text);
  const result = spawnSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      root,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
    ],
    { encoding: "utf8" },
  );
  expect({
    exit: result.status,
    stdout: result.stdout,
    error: result.stderr.includes("package-lock.json"),
  }).toEqual({ exit: 1, stdout: "", error: true });
});
it("fails on a symlinked selected lockfile without reading it", async () => {
  const root = await fixture({});
  await rm(join(root, "package-lock.json"));
  await symlink(join(root, "package.json"), join(root, "package-lock.json"));
  await expect(scanProject(root, target)).rejects.toThrow(/package-lock.json/);
});
it("does not disclose registry credentials or local link targets from lock metadata", async () => {
  const root = await fixture({
    "node_modules/a": {
      version: "1.0.0",
      resolved: "https://example.invalid?token=fixture-token",
      dependencies: { remote: "https://example.invalid?token=fixture-token" },
    },
    "node_modules/local": { link: true, resolved: "/private/fixture-path" },
  });
  expect(JSON.stringify(await scanProject(root, target))).not.toMatch(
    /fixture-token|fixture-path|example.invalid/,
  );
});
it("keeps cycles finite and produces schema-valid identical CLI/core graphs", async () => {
  const root = await fixture(
    {
      "node_modules/a": { version: "1.0.0", dependencies: { b: "^1" } },
      "node_modules/b": { version: "1.0.0", dependencies: { a: "^1" } },
    },
    { dependencies: { a: "^1" } },
  );
  const report = await scanProject(root, target);
  const raw = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      root,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
    ],
    { encoding: "utf8" },
  );
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  expect({
    cli: JSON.parse(raw),
    repeat: await scanProject(root, target),
    valid: new Ajv().compile(schema)(report),
    edges: report.dependencyGraph.edges.length,
  }).toEqual({ cli: report, repeat: report, valid: true, edges: 3 });
});

it("uses optional dependency overrides for effective graph edges while retaining declarations", async () => {
  const root = await fixture(
    { "node_modules/a": { version: "2.0.0" } },
    { dependencies: { a: "^1" }, optionalDependencies: { a: "^2" } },
  );
  const report = await scanProject(root, target);
  expect({
    declared: report.dependencies.length,
    edges: report.dependencyGraph.edges.map((e) => [
      e.name,
      e.section,
      e.specifier,
    ]),
  }).toEqual({ declared: 2, edges: [["a", "optionalDependencies", "^2"]] });
});
it("labels a package without a recorded version unsupported instead of resolved", async () => {
  const root = await fixture(
    { "node_modules/peer": {} },
    { peerDependencies: { peer: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges[0]?.resolution,
  ).toBe("unsupported");
});
it("limits graph cardinality before accepting an oversized package table", async () => {
  const packages = Object.fromEntries(
    Array.from({ length: 10001 }, (_, i) => [
      `node_modules/pkg${i}`,
      { version: "1.0.0" },
    ]),
  );
  await expect(scanProject(await fixture(packages), target)).rejects.toThrow(
    /package count limit/,
  );
});

it.each([2, 3])(
  "accepts npm v%i normalized optional overrides without a false stale-root warning",
  async (version) => {
    const root = await fixture(
      {
        "": { optionalDependencies: { a: "^2" } },
        "node_modules/a": { version: "2.0.0" },
      },
      { dependencies: { a: "^1" }, optionalDependencies: { a: "^2" } },
      version,
    );
    expect(
      (await scanProject(root, target)).coverage.limitations.some(
        (l) => l.code === "manifest-lockfile-mismatch",
      ),
    ).toBe(false);
  },
);

it("scans the documented npm graph fixture with the expected missing optional edge", async () => {
  const report = await scanProject("fixtures/developer/npm-graph", target);
  expect({
    nodes: report.dependencyGraph.nodes.length,
    edges: report.dependencyGraph.edges.length,
    missing: report.dependencyGraph.edges
      .filter((e) => e.resolution === "missing")
      .map((e) => e.name),
  }).toEqual({ nodes: 4, edges: 5, missing: ["native-addon"] });
});

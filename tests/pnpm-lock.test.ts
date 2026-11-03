import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Ajv } from "ajv";
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";
const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
};
const roots: string[] = [];
async function fixture(lock: unknown, manifest: unknown = {}) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-pnpm-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(
    join(root, "pnpm-lock.yaml"),
    typeof lock === "string" ? lock : JSON.stringify(lock),
  );
  return root;
}
function lock(
  importer: object = {},
  packages: object = {},
  snapshots: object = {},
) {
  return {
    lockfileVersion: "9.0",
    importers: { ".": importer },
    packages,
    snapshots,
  };
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("extracts root and transitive pnpm snapshots without merging peer contexts", async () => {
  const root = await fixture(
    lock(
      {
        dependencies: {
          a: { specifier: "^1", version: "1.0.0(peer@2.0.0)" },
          b: { specifier: "^1", version: "1.0.0" },
        },
      },
      {
        "a@1.0.0": { peerDependencies: { peer: "^2" } },
        "b@1.0.0": {},
        "peer@2.0.0": {},
        "peer@3.0.0": {},
      },
      {
        "a@1.0.0(peer@2.0.0)": { dependencies: { peer: "2.0.0" } },
        "a@1.0.0(peer@3.0.0)": { dependencies: { peer: "3.0.0" } },
        "b@1.0.0": { dependencies: { a: "1.0.0(peer@3.0.0)" } },
        "peer@2.0.0": {},
        "peer@3.0.0": {},
      },
    ),
    { dependencies: { a: "^1", b: "^1" } },
  );
  const graph = (await scanProject(root, target)).dependencyGraph;
  expect({
    nodes: graph.nodes.map((n) => n.id),
    edges: graph.edges.map((e) => [e.from, e.name, e.section, e.to]),
  }).toEqual({
    nodes: [
      "pnpm:a@1.0.0(peer@2.0.0)",
      "pnpm:a@1.0.0(peer@3.0.0)",
      "pnpm:b@1.0.0",
      "pnpm:peer@2.0.0",
      "pnpm:peer@3.0.0",
    ],
    edges: [
      ["", "a", "dependencies", "pnpm:a@1.0.0(peer@2.0.0)"],
      ["", "b", "dependencies", "pnpm:b@1.0.0"],
      [
        "pnpm:a@1.0.0(peer@2.0.0)",
        "peer",
        "peerDependencies",
        "pnpm:peer@2.0.0",
      ],
      [
        "pnpm:a@1.0.0(peer@3.0.0)",
        "peer",
        "peerDependencies",
        "pnpm:peer@3.0.0",
      ],
      ["pnpm:b@1.0.0", "a", "dependencies", "pnpm:a@1.0.0(peer@3.0.0)"],
    ],
  });
});
it("preserves scoped alias identity and nested peer suffixes", async () => {
  const id = "@scope/real@1.0.0(peer@2.0.0(other@3.0.0))";
  const root = await fixture(
    lock(
      {
        dependencies: {
          alias: { specifier: "npm:@scope/real@^1", version: id },
        },
      },
      { "@scope/real@1.0.0": {} },
      { [id]: {} },
    ),
    { dependencies: { alias: "npm:@scope/real@^1" } },
  );
  const report = await scanProject(root, target);
  expect({
    node: report.dependencyGraph.nodes[0],
    edge: report.dependencyGraph.edges[0]?.to,
  }).toEqual({
    node: {
      id: "pnpm:" + id,
      name: "@scope/real",
      installName: "@scope/real",
      version: "1.0.0",
      link: false,
    },
    edge: "pnpm:" + id,
  });
});
it("matches automatically installed root peers recorded under importer dependencies", async () => {
  const root = await fixture(
    lock(
      { dependencies: { peer: { specifier: "^2", version: "2.0.0" } } },
      { "peer@2.0.0": {} },
      { "peer@2.0.0": {} },
    ),
    { peerDependencies: { peer: "^2" } },
  );
  const report = await scanProject(root, target);
  expect({
    section: report.dependencyGraph.edges[0]?.section,
    mismatch: report.coverage.limitations.some(
      (l) => l.code === "manifest-lockfile-mismatch",
    ),
  }).toEqual({ section: "peerDependencies", mismatch: false });
});
it("leaves missing references and local workspace links explicit", async () => {
  const root = await fixture(
    lock({
      dependencies: {
        absent: { specifier: "^1", version: "1.0.0" },
        local: { specifier: "workspace:*", version: "link:packages/local" },
      },
    }),
    { dependencies: { absent: "^1", local: "workspace:*" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges.map((e) => [
      e.name,
      e.resolution,
      e.to,
    ]),
  ).toEqual([
    ["absent", "missing", null],
    ["local", "unsupported", null],
  ]);
});
it("does not manufacture nodes from package metadata without a matching snapshot", async () => {
  const root = await fixture(
    lock(
      { dependencies: { a: { specifier: "^1", version: "1.0.0" } } },
      { "a@1.0.0": {} },
    ),
    { dependencies: { a: "^1" } },
  );
  expect((await scanProject(root, target)).dependencyGraph.nodes).toEqual([]);
});
it("reports skipped workspace importers and absent metadata for snapshots", async () => {
  const data = {
    ...lock({}, {}, { "a@1.0.0": {} }),
    importers: { ".": {}, "packages/local": {} },
  };
  expect(
    (await scanProject(await fixture(data), target)).coverage.limitations.map(
      (l) => l.code,
    ),
  ).toEqual(
    expect.arrayContaining([
      "workspace-importer-not-analyzed",
      "pnpm-package-metadata-missing",
    ]),
  );
});
it("flags stale root specifiers instead of treating the lockfile as current", async () => {
  const root = await fixture(
    lock(
      { dependencies: { a: { specifier: "^1", version: "1.0.0" } } },
      { "a@1.0.0": {} },
      { "a@1.0.0": {} },
    ),
    { dependencies: { a: "^9" } },
  );
  expect(
    (await scanProject(root, target)).coverage.limitations.map((l) => l.code),
  ).toContain("manifest-lockfile-mismatch");
});
it("accepts root-only empty lockfiles without package/snapshot tables", async () => {
  const report = await scanProject(
    await fixture({ lockfileVersion: "9.0", importers: { ".": {} } }),
    target,
  );
  expect({
    coverage: report.coverage.dependencyGraph,
    nodes: report.dependencyGraph.nodes,
  }).toEqual({ coverage: "pnpm-lockfile-partial", nodes: [] });
});
it.each(["6.0", "9.1"])(
  "marks unimplemented pnpm version %s unknown",
  async (version) => {
    const report = await scanProject(
      await fixture({ lockfileVersion: version }),
      target,
    );
    expect(report.coverage.limitations.map((l) => l.code)).toContain(
      "unsupported-pnpm-lockfile-version",
    );
  },
);
it.each([
  "lockfileVersion: [",
  "null",
  'lockfileVersion: "9.0"\nlockfileVersion: "9.0"',
  'lockfileVersion: "9.0"\nimporters: []',
  'lockfileVersion: "9.0"\nimporters: {.: {dependencies: {a: {specifier: "*", version: 42}}}}',
  'lockfileVersion: "9.0"\nimporters: {.: {}}\npackages: []',
  'lockfileVersion: "9.0"\nimporters: {.: {}}\nsnapshots: {a@1.0.0: {dependencies: []}}',
  'lockfileVersion: "9.0"\nimporters: {.: {}}\nextra: &anchor {a: 1}\ncopy: *anchor',
  'lockfileVersion: "9.0"\nimporters: {.: {}}\nextra: !unsupported secret-value',
  'lockfileVersion: "9.0"\nimporters: {.: {}}\n---\nsecret-value: true',
])(
  "rejects malformed or unsafe YAML without source excerpts: %s",
  async (text) => {
    const root = await fixture(text);
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
      code: result.status,
      stdout: result.stdout,
      diagnostic: result.stderr.includes("pnpm-lock.yaml"),
      sourceLeak: result.stderr.includes("secret-value"),
    }).toEqual({ code: 1, stdout: "", diagnostic: true, sourceLeak: false });
  },
);
it("does not serialize credential-bearing or unsupported remote snapshot identities", async () => {
  const root = await fixture(
    lock(
      {
        dependencies: {
          remote: {
            specifier: "https://example.invalid/pkg?token=fixture-secret",
            version: "https://example.invalid/pkg?token=fixture-secret",
          },
        },
      },
      {
        "remote@https://example.invalid?token=fixture-secret": {
          resolution: {
            tarball: "https://example.invalid?token=fixture-secret",
          },
        },
      },
      { "remote@https://example.invalid?token=fixture-secret": {} },
    ),
    {
      dependencies: {
        remote: "https://example.invalid/pkg?token=fixture-secret",
      },
    },
  );
  const report = await scanProject(root, target);
  expect({
    leak: JSON.stringify(report).includes("fixture-secret"),
    resolution: report.dependencyGraph.edges[0]?.resolution,
  }).toEqual({ leak: false, resolution: "unsupported" });
});
it("requires explicit manager selection when both npm and pnpm locks exist", async () => {
  const root = await fixture(lock());
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify({ lockfileVersion: 3, packages: { "": {} } }),
  );
  await expect(scanProject(root, target)).rejects.toThrow(
    /Multiple.*lockfiles/,
  );
});
it("honors a pnpm packageManager when a stale npm lock is also present", async () => {
  const root = await fixture(lock(), { packageManager: "pnpm@10.34.9" });
  await writeFile(join(root, "package-lock.json"), "{");
  const report = await scanProject(root, target);
  expect({
    source: report.dependencyGraph.source,
    ignored: report.coverage.limitations.find(
      (l) => l.path === "package-lock.json",
    ),
  }).toEqual({
    source: "pnpm-lock.yaml",
    ignored: { code: "lockfile-not-analyzed", path: "package-lock.json" },
  });
});
it("honors an npm packageManager without parsing an ignored invalid pnpm lock", async () => {
  const root = await fixture("not: [valid", { packageManager: "npm@10.9.9" });
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify({ lockfileVersion: 3, packages: { "": {} } }),
  );
  expect((await scanProject(root, target)).dependencyGraph.source).toBe(
    "package-lock.json",
  );
});
it("rejects a selected symlinked pnpm lockfile", async () => {
  const root = await fixture(lock());
  await rm(join(root, "pnpm-lock.yaml"));
  await symlink(join(root, "package.json"), join(root, "pnpm-lock.yaml"));
  await expect(scanProject(root, target)).rejects.toThrow(/pnpm-lock.yaml/);
});
it("emits identical schema-valid pnpm graphs through CLI and core", async () => {
  const root = await fixture(
    lock(
      { dependencies: { a: { specifier: "^1", version: "1.0.0" } } },
      { "a@1.0.0": {} },
      { "a@1.0.0": { dependencies: { a: "1.0.0" } } },
    ),
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
  }).toEqual({ cli: report, repeat: report, valid: true });
});

it("keeps absent declared snapshot peers visible as missing edges", async () => {
  const root = await fixture(
    lock(
      { dependencies: { a: { specifier: "^1", version: "1.0.0" } } },
      {
        "a@1.0.0": {
          peerDependencies: { peer: "^2" },
          peerDependenciesMeta: { peer: { optional: true } },
        },
      },
      { "a@1.0.0": {} },
    ),
    { dependencies: { a: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges.find(
      (e) => e.from === "pnpm:a@1.0.0",
    ),
  ).toMatchObject({
    name: "peer",
    section: "peerDependencies",
    specifier: "^2",
    resolution: "missing",
    to: null,
  });
});
it("limits snapshot cardinality before constructing an unbounded graph", async () => {
  const snapshots = Object.fromEntries(
    Array.from({ length: 10001 }, (_, i) => [`a${i}@1.0.0`, {}]),
  );
  await expect(
    scanProject(await fixture(lock({}, {}, snapshots)), target),
  ).rejects.toThrow(/count limit/);
});
it("treats patch contexts as unsupported instead of merging with an unpatched snapshot", async () => {
  const root = await fixture(
    lock(
      {
        dependencies: {
          a: { specifier: "^1", version: "1.0.0(patch_hash=fixture)" },
        },
      },
      { "a@1.0.0": {} },
      { "a@1.0.0": {}, "a@1.0.0(patch_hash=fixture)": {} },
    ),
    { dependencies: { a: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges[0],
  ).toMatchObject({ resolution: "unsupported", to: null });
});

it("retains declared peer ranges separately from resolved snapshot versions", async () => {
  const root = await fixture(
    lock(
      {
        dependencies: { a: { specifier: "^1", version: "1.0.0(peer@2.0.0)" } },
      },
      { "a@1.0.0": { peerDependencies: { peer: "^2" } }, "peer@2.0.0": {} },
      {
        "a@1.0.0(peer@2.0.0)": { dependencies: { peer: "2.0.0" } },
        "peer@2.0.0": {},
      },
    ),
    { dependencies: { a: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges.find((e) =>
      e.from.startsWith("pnpm:a@"),
    ),
  ).toMatchObject({
    specifier: "^2",
    to: "pnpm:peer@2.0.0",
    section: "peerDependencies",
  });
});

it("scans the documented pnpm fixture with an alias, peer and missing optional edge", async () => {
  const report = await scanProject("fixtures/developer/pnpm-graph", target);
  expect({
    nodes: report.dependencyGraph.nodes.length,
    edges: report.dependencyGraph.edges.length,
    missing: report.dependencyGraph.edges
      .filter((e) => e.resolution === "missing")
      .map((e) => e.name),
    mismatch: report.coverage.limitations.some(
      (l) => l.code === "manifest-lockfile-mismatch",
    ),
  }).toEqual({
    nodes: 3,
    edges: 5,
    missing: ["native-addon"],
    mismatch: false,
  });
});

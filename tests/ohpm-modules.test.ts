import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
async function fixture(modules: unknown) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-ohpm-modules-"));
  roots.push(root);
  await writeFile(
    join(root, "oh-package.json5"),
    "{dependencies:{root:'1.0.0'}}",
  );
  await writeFile(
    join(root, "build-profile.json5"),
    JSON.stringify({
      modules,
      app: { signingConfigs: [{ private: "secret-field" }] },
    }),
  );
  return root;
}
async function addModule(
  root: string,
  path: string,
  version: string,
  locked = true,
) {
  const dir = join(root, path);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "oh-package.json5"),
    `{ dependencies: { shared: '${version}' } }`,
  );
  if (locked) {
    const key = "shared@" + version;
    await writeFile(
      join(dir, "oh-package-lock.json5"),
      JSON.stringify({
        lockfileVersion: 3,
        specifiers: { [key]: key },
        packages: { [key]: { name: "shared", version, registryType: "ohpm" } },
      }),
    );
  }
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("keeps module versions, graph roots and declaration locations separate", async () => {
  const root = await fixture([
    { srcPath: "./feature" },
    { srcPath: "./entry" },
  ]);
  await addModule(root, "feature", "2.0.0");
  await addModule(root, "entry", "1.0.0");
  await addModule(root, "unlisted", "3.0.0");
  await writeFile(join(root, "entry", "main.ts"), 'import "shared";');
  const report = await scanProject(root, target);
  expect(report.dependencies.map((d) => d.name)).toEqual(["root"]);
  expect(
    report.modules?.map((m) => [
      m.path,
      m.dependencies[0]?.specifier,
      m.dependencyGraph.edges[0]?.to,
    ]),
  ).toEqual([
    ["entry", "1.0.0", "shared@1.0.0"],
    ["feature", "2.0.0", "shared@2.0.0"],
  ]);
  expect(
    report.findings
      .filter((f) => f.ruleId === "inventory.dependency")
      .map((f) => f.location.path),
  ).toEqual([
    "oh-package.json5",
    "entry/oh-package.json5",
    "feature/oh-package.json5",
  ]);
  expect(report.coverage.sourceFiles).toBe(1);
  expect(
    report.coverage.limitations.filter(
      (l) => l.code === "nested-manifest-not-analyzed",
    ),
  ).toEqual([
    { code: "nested-manifest-not-analyzed", path: "unlisted/oh-package.json5" },
  ]);
  expect(JSON.stringify(report)).not.toContain("secret-field");
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
});
it("skips outside, symlinked and missing modules while keeping available declarations", async () => {
  const root = await fixture([
    { srcPath: "../outside-secret" },
    { srcPath: "linked" },
    { srcPath: "missing" },
    { srcPath: "empty" },
    { srcPath: "entry" },
  ]);
  const outside = await fixture([]);
  await symlink(outside, join(root, "linked"));
  await mkdir(join(root, "empty"));
  await addModule(root, "entry", "1.0.0", false);
  const report = await scanProject(root, target);
  expect(report.modules?.map((m) => [m.path, m.coverage])).toEqual([
    ["entry", "declarations-only"],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "external-ohpm-module-not-analyzed",
        path: "build-profile.json5",
      },
      { code: "ohpm-module-directory-unavailable", path: "linked" },
      { code: "ohpm-module-directory-unavailable", path: "missing" },
      { code: "ohpm-module-manifest-missing", path: "empty" },
    ]),
  );
  expect(JSON.stringify(report)).not.toContain("outside-secret");
});
it.each([
  {},
  [{ srcPath: null }],
  [{ srcPath: "entry" }, { srcPath: "./entry" }],
])("rejects malformed or duplicate module selections: %#", async (modules) => {
  await expect(scanProject(await fixture(modules), target)).rejects.toThrow(
    /build-profile.json5/,
  );
});

it("does not borrow the root lock for a unified or otherwise unsupported module lock", async () => {
  const root = await fixture([{ srcPath: "entry" }]);
  await addModule(root, "entry", "1.0.0", false);
  await writeFile(
    join(root, "entry", "oh-package.json5"),
    "{dependencies:{shared:'1.0.0'},dynamicDependencies:{other:'1.0.0'}}",
  );
  await writeFile(
    join(root, "entry", "oh-package-lock.json5"),
    "{lockfileVersion:3,meta:{enableUnifiedLockfile:true}}",
  );
  const report = await scanProject(root, target);
  expect(report.modules?.[0]).toMatchObject({
    coverage: "declarations-only",
    dependencyGraph: { nodes: [], edges: [] },
  });
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "unified-ohpm-lockfile-not-analyzed",
        path: "entry/oh-package-lock.json5",
      },
      {
        code: "ohpm-dynamic-dependencies-not-analyzed",
        path: "entry/oh-package.json5",
      },
    ]),
  );
});

it.each(["{modules: [", "[]", "{modules:null}"])(
  "rejects invalid profile %s without reflecting its contents",
  async (text) => {
    const root = await fixture([]);
    await writeFile(join(root, "build-profile.json5"), text);
    await expect(scanProject(root, target)).rejects.toThrow(
      /build-profile.json5/,
    );
  },
);

it("projects reachable module edges from one unified root lock with normalized local references", async () => {
  const root = await fixture([
    { srcPath: "./entry" },
    { srcPath: "./feature" },
  ]);
  await addModule(root, "entry", "1.0.0");
  await addModule(root, "feature", "2.0.0", false);
  await writeFile(
    join(root, "entry", "oh-package.json5"),
    "{dependencies:{shared:'1.0.0',asset:'file:../libs/private.har'}}",
  );
  const locators = [
    "root@1.0.0",
    "shared@1.0.0",
    "shared@2.0.0",
    "child@1.0.0",
    "asset@libs/private.har",
  ];
  const entries = locators.map((locator) => {
    const [name, version] = locator.split("@");
    return [
      locator,
      name === "asset"
        ? { name, version: "3.0.0", registryType: "local" }
        : {
            name,
            version,
            registryType: "ohpm",
            ...(locator === "shared@1.0.0"
              ? { dependencies: { child: "1.0.0" } }
              : {}),
          },
    ];
  });
  await writeFile(
    join(root, "oh-package-lock.json5"),
    JSON.stringify({
      lockfileVersion: 3,
      meta: { enableUnifiedLockfile: true },
      specifiers: Object.fromEntries(locators.map((key) => [key, key])),
      packages: Object.fromEntries(entries),
    }),
  );
  const report = await scanProject(root, target);
  expect(report.dependencyGraph.nodes.map((n) => n.name)).toEqual(["root"]);
  const [entry, feature] = report.modules ?? [];
  expect(entry?.dependencyGraph.nodes.map((n) => [n.name, n.version])).toEqual([
    ["asset", "3.0.0"],
    ["child", "1.0.0"],
    ["shared", "1.0.0"],
  ]);
  expect(entry?.dependencyGraph.edges).toMatchObject([
    {
      from: "",
      name: "asset",
      resolution: "unsupported",
      specifier: "[local-reference]",
    },
    { from: "", name: "shared", resolution: "locked" },
    { from: "shared@1.0.0", name: "child", resolution: "locked" },
  ]);
  expect(
    feature?.dependencyGraph.nodes.map((n) => [n.name, n.version]),
  ).toEqual([["shared", "2.0.0"]]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      { code: "ohpm-unified-root-lock-used", path: "entry" },
      {
        code: "ohpm-module-lock-ignored-by-unified-root",
        path: "entry/oh-package-lock.json5",
      },
    ]),
  );
  expect(JSON.stringify(report)).not.toContain("private.har");
});

it("does not attach unified file references outside the tree or to registry nodes", async () => {
  const root = await fixture([{ srcPath: "entry" }]);
  await addModule(root, "entry", "1.0.0", false);
  await writeFile(
    join(root, "entry", "oh-package.json5"),
    JSON.stringify({
      dependencies: {
        escaped: "file:../../private.har",
        absolute: "file:/private.har",
        empty: "file:",
        registry: "file:../cache.har",
      },
    }),
  );
  await writeFile(
    join(root, "oh-package-lock.json5"),
    JSON.stringify({
      lockfileVersion: 3,
      meta: { enableUnifiedLockfile: true },
      specifiers: {
        "escaped@../private.har": "escaped@../private.har",
        "registry@cache.har": "registry@1.0.0",
      },
      packages: {
        "escaped@../private.har": {
          registryType: "local",
          name: "escaped",
          version: "1.0.0",
        },
        "registry@1.0.0": {
          registryType: "ohpm",
          name: "registry",
          version: "1.0.0",
        },
      },
    }),
  );
  const report = await scanProject(root, target);
  const graph = report.modules?.[0]?.dependencyGraph;
  expect(graph?.nodes).toEqual([]);
  expect(graph?.edges.map((e) => [e.resolution, e.to])).toEqual(
    Array.from({ length: 4 }, () => ["unsupported", null]),
  );
  expect(JSON.stringify(report)).not.toContain("private.har");
});

import { afterEach, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
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
  apiLevel: 20,
};
const roots: string[] = [];

async function root(manifest: Record<string, unknown>, workspace: unknown) {
  const path = await mkdtemp(join(tmpdir(), "arkcompat-pnpm-workspaces-"));
  roots.push(path);
  await writeFile(
    join(path, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
  if (workspace !== undefined)
    await writeFile(
      join(path, "pnpm-workspace.yaml"),
      typeof workspace === "string"
        ? workspace
        : JSON.stringify(workspace, null, 2),
    );
  return path;
}

async function workspace(
  rootPath: string,
  path: string,
  manifest: Record<string, unknown>,
) {
  const directory = join(rootPath, path);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
}

async function lock(rootPath: string, data: unknown) {
  await writeFile(
    join(rootPath, "pnpm-lock.yaml"),
    JSON.stringify(data, null, 2),
  );
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

it("inventories pnpm workspace importers and scopes reachable edges", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    dependencies: { "@fixture/alpha": "workspace:*" },
  };
  const path = await root(manifest, { packages: ["packages/*"] });
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: {
      "@fixture/beta": "workspace:*",
      external: "^1",
    },
    devDependencies: { devtool: "^1" },
  });
  await workspace(path, "packages/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
  });
  await writeFile(join(path, "packages/alpha/pnpm-lock.yaml"), "ignored");
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {
        dependencies: {
          "@fixture/alpha": {
            specifier: "workspace:*",
            version: "link:packages/alpha",
          },
        },
      },
      "packages/alpha": {
        dependencies: {
          "@fixture/beta": {
            specifier: "workspace:*",
            version: "link:packages/beta",
          },
          external: { specifier: "^1", version: "1.0.0" },
        },
        devDependencies: {
          devtool: { specifier: "^1", version: "1.0.0" },
        },
      },
      "packages/beta": {},
    },
    packages: {
      "devtool@1.0.0": {},
      "external@1.0.0": { dependencies: { util: "^2" } },
      "util@2.0.0": {},
    },
    snapshots: {
      "devtool@1.0.0": {},
      "external@1.0.0": { dependencies: { util: "2.0.0" } },
      "util@2.0.0": {},
    },
  });
  const report = await scanProject(path, target);
  expect(report.schemaVersion).toBe("0.12.0");
  expect(
    report.modules?.map((module) => [
      module.kind,
      module.path,
      module.coverage,
      module.dependencies.map((dependency) => dependency.name),
    ]),
  ).toEqual([
    [
      "pnpm",
      "packages/alpha",
      "pnpm-lockfile-partial",
      ["@fixture/beta", "external", "devtool"],
    ],
    ["pnpm", "packages/beta", "pnpm-lockfile-partial", []],
  ]);
  expect(report.modules?.[0]?.dependencyGraph).toEqual({
    source: "pnpm-lock.yaml",
    lockfileVersion: 9,
    nodes: [
      {
        id: "pnpm:devtool@1.0.0",
        installName: "devtool",
        name: "devtool",
        version: "1.0.0",
        link: false,
      },
      {
        id: "pnpm:external@1.0.0",
        installName: "external",
        name: "external",
        version: "1.0.0",
        link: false,
      },
      {
        id: "pnpm:util@2.0.0",
        installName: "util",
        name: "util",
        version: "2.0.0",
        link: false,
      },
    ],
    edges: [
      {
        from: "",
        name: "@fixture/beta",
        specifier: "workspace:*",
        section: "dependencies",
        to: null,
        resolution: "unsupported",
      },
      {
        from: "",
        name: "external",
        specifier: "^1",
        section: "dependencies",
        to: "pnpm:external@1.0.0",
        resolution: "locked",
      },
      {
        from: "",
        name: "devtool",
        specifier: "^1",
        section: "devDependencies",
        to: "pnpm:devtool@1.0.0",
        resolution: "locked",
      },
      {
        from: "pnpm:external@1.0.0",
        name: "util",
        specifier: "^2",
        section: "dependencies",
        to: "pnpm:util@2.0.0",
        resolution: "locked",
      },
    ],
  });
  expect(
    report.findings
      .filter((finding) => finding.ruleId === "inventory.dependency")
      .map((finding) => finding.location.path),
  ).toEqual([
    "package.json",
    "packages/alpha/package.json",
    "packages/alpha/package.json",
    "packages/alpha/package.json",
  ]);
  expect(
    report.coverage.limitations.filter(
      (limitation) => limitation.code === "nested-manifest-not-analyzed",
    ),
  ).toEqual([]);
  expect(report.coverage.limitations).toContainEqual({
    code: "lockfile-not-analyzed",
    path: "packages/alpha/pnpm-lock.yaml",
  });
});

it("keeps a recorded pnpm workspace target visible when its version contradicts the manifest range", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
  };
  const path = await root(manifest, { packages: ["packages/alpha"] });
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^2.0.0" },
  });
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {},
      "packages/alpha": {
        dependencies: {
          external: { specifier: "^2.0.0", version: "1.9.0" },
        },
      },
    },
    packages: { "external@1.9.0": {} },
    snapshots: { "external@1.9.0": {} },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "external",
      specifier: "^2.0.0",
      section: "dependencies",
      to: "pnpm:external@1.9.0",
      resolution: "mismatch",
    },
  ]);
  expect(report.coverage.limitations).toContainEqual({
    code: "dependency-range-mismatch",
    path: "packages/alpha/package.json",
  });
});

it("inventories declared pnpm workspaces when the lockfile is missing", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      packageManager: "pnpm@10.34.9",
    },
    { packages: ["packages/alpha"] },
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });

  const report = await scanProject(path, target);

  expect(report.modules?.[0]).toMatchObject({
    kind: "pnpm",
    path: "packages/alpha",
    coverage: "declarations-only",
    dependencyGraph: {
      source: null,
      lockfileVersion: null,
      nodes: [],
      edges: [],
    },
  });
  expect(report.coverage.dependencyGraph).toBe("declarations-only");
  expect(report.coverage.limitations).toContainEqual({
    code: "pnpm-workspace-lock-not-parsed",
    path: "packages/alpha/package.json",
  });
});

it("keeps stale, missing, duplicate and unmatched pnpm workspaces declarations-only", async () => {
  const path = await root(
    { name: "workspace-root", private: true },
    { packages: ["members/*"] },
  );
  await workspace(path, "members/duplicate-a", {
    name: "@fixture/duplicate",
    version: "1.0.0",
  });
  await workspace(path, "members/duplicate-b", {
    name: "@fixture/duplicate",
    version: "2.0.0",
  });
  await workspace(path, "members/stale", {
    name: "@fixture/stale",
    version: "1.0.0",
    dependencies: { changed: "^2" },
  });
  await workspace(path, "members/unlocked", {
    name: "@fixture/unlocked",
    version: "1.0.0",
  });
  await workspace(path, "members/anonymous", { version: "1.0.0" });
  await workspace(path, "members/versionless", {
    name: "@fixture/versionless",
  });
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {},
      "members/duplicate-a": {},
      "members/duplicate-b": {},
      "members/stale": {
        dependencies: {
          changed: { specifier: "^1", version: "1.0.0" },
        },
      },
      "members/anonymous": {},
      "members/versionless": {},
      "members/lock-only": {},
    },
    packages: { "changed@1.0.0": {} },
    snapshots: { "changed@1.0.0": {} },
  });
  const report = await scanProject(path, target);
  expect(
    report.modules?.map((module) => [
      module.path,
      module.coverage,
      module.dependencyGraph.edges.length,
    ]),
  ).toEqual([
    ["members/anonymous", "declarations-only", 0],
    ["members/duplicate-a", "declarations-only", 0],
    ["members/duplicate-b", "declarations-only", 0],
    ["members/stale", "declarations-only", 0],
    ["members/unlocked", "declarations-only", 0],
    ["members/versionless", "declarations-only", 0],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "pnpm-workspace-name-duplicate",
        path: "members/duplicate-a/package.json",
      },
      {
        code: "pnpm-workspace-name-missing",
        path: "members/anonymous/package.json",
      },
      {
        code: "pnpm-workspace-version-missing",
        path: "members/versionless/package.json",
      },
      {
        code: "pnpm-workspace-importer-missing",
        path: "members/unlocked/package.json",
      },
      {
        code: "pnpm-workspace-importer-not-selected",
        path: "members/lock-only",
      },
      {
        code: "pnpm-workspace-manifest-lock-mismatch",
        path: "members/stale/package.json",
      },
    ]),
  );
});

it("fails closed on unsafe or unsupported pnpm workspace selections", async () => {
  const path = await root(
    { name: "workspace-root", private: true },
    {
      packages: [
        "members/good",
        "../outside-secret",
        "/private-secret",
        "https://secret.invalid/workspace",
        "members/[good,broken]",
      ],
    },
  );
  await workspace(path, "members/good", {
    name: "@fixture/good",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {},
      "members/good": {
        dependencies: {
          external: { specifier: "^1", version: "1.0.0" },
        },
      },
    },
    packages: { "external@1.0.0": {} },
    snapshots: { "external@1.0.0": {} },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]).toMatchObject({
    kind: "pnpm",
    path: "members/good",
    coverage: "pnpm-lockfile-partial",
  });
  expect(report.coverage.limitations.map((item) => item.code)).toEqual(
    expect.arrayContaining([
      "pnpm-workspace-pattern-unsafe",
      "pnpm-workspace-pattern-unsupported",
    ]),
  );
  expect(JSON.stringify(report)).not.toMatch(/outside-secret|secret\.invalid/);
});

it("expands bounded comma-list braces in pnpm workspace selections", async () => {
  const path = await root(
    { name: "workspace-root", private: true },
    { packages: ["members/{alpha,group-{a,b}/*}"] },
  );
  await workspace(path, "members/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await workspace(path, "members/group-a/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
  });
  await workspace(path, "members/group-b/gamma", {
    name: "@fixture/gamma",
    version: "1.0.0",
  });
  await workspace(path, "members/other/delta", {
    name: "@fixture/delta",
    version: "1.0.0",
  });
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {},
      "members/alpha": {
        dependencies: {
          external: { specifier: "^1", version: "1.0.0" },
        },
      },
      "members/group-a/beta": {},
      "members/group-b/gamma": {},
    },
    packages: { "external@1.0.0": {} },
    snapshots: { "external@1.0.0": {} },
  });

  const report = await scanProject(path, target);

  expect(report.modules?.map((module) => module.path)).toEqual([
    "members/alpha",
    "members/group-a/beta",
    "members/group-b/gamma",
  ]);
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "pnpm-workspace-pattern-unsupported",
  );
});

it("skips symlinked pnpm workspace manifests and stays within the cap", async () => {
  const packages = [
    "members/w0",
    "members/linked",
    ...Array.from({ length: 128 }, (_, index) => `members/w${index + 1}`),
  ];
  const path = await root(
    { name: "workspace-root", private: true },
    { packages },
  );
  await workspace(path, "members/w0", {
    name: "@fixture/zero",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  const outside = await root({ name: "@fixture/outside" }, undefined);
  await mkdir(join(path, "members"), { recursive: true });
  await symlink(outside, join(path, "members", "linked"));
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {},
      "members/w0": {
        dependencies: {
          external: { specifier: "^1", version: "1.0.0" },
        },
      },
    },
    packages: { "external@1.0.0": {} },
    snapshots: { "external@1.0.0": {} },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.map((module) => module.path)).toEqual(["members/w0"]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "pnpm-workspace-directory-unavailable",
        path: "members/linked",
      },
      { code: "pnpm-workspace-limit-exceeded" },
    ]),
  );
});

it("keeps extra lock importers explicit when no pnpm workspace file exists", async () => {
  const path = await root({ name: "workspace-root", private: true }, undefined);
  await lock(path, {
    lockfileVersion: "9.0",
    importers: { ".": {}, "members/local": {} },
  });
  const report = await scanProject(path, target);
  expect(report.coverage.limitations).toContainEqual({
    code: "workspace-importer-not-analyzed",
    path: "members/local",
  });
});

it.each([
  ["not: [valid", /pnpm-workspace\.yaml/],
  ["[]", /expected an object/],
  ['{"packages":"members/*"}', /packages must be an array/],
  ['{"packages":["members/good",42]}', /packages must be an array/],
])(
  "fails directly on malformed pnpm workspace config %s",
  async (workspace, diagnostic) => {
    const path = await root(
      { name: "workspace-root", private: true },
      workspace,
    );
    await lock(path, {
      lockfileVersion: "9.0",
      importers: { ".": {} },
    });
    await expect(scanProject(path, target)).rejects.toThrow(diagnostic);
  },
);

it("keeps selected workspaces declarations-only for an unparsed lock version", async () => {
  const path = await root(
    { name: "workspace-root", private: true },
    { packages: ["members/alpha"] },
  );
  await workspace(path, "members/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await lock(path, {
    lockfileVersion: "9.1",
    importers: { ".": {}, "members/alpha": {} },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]).toMatchObject({
    kind: "pnpm",
    path: "members/alpha",
    coverage: "declarations-only",
    dependencyGraph: { source: null, edges: [] },
  });
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      { code: "unsupported-pnpm-lockfile-version", path: "pnpm-lock.yaml" },
      {
        code: "pnpm-workspace-lock-not-parsed",
        path: "members/alpha/package.json",
      },
    ]),
  );
});

it("scans the checked-in pnpm workspace fixture deterministically", async () => {
  const report = await scanProject(
    "fixtures/developer/pnpm-workspaces",
    target,
  );
  expect({
    modules: report.modules?.map((module) => [
      module.path,
      module.coverage,
      module.dependencyGraph.edges.map((edge) => [edge.name, edge.resolution]),
    ]),
    unknown: report.findings.every((finding) => finding.status === "unknown"),
  }).toEqual({
    modules: [
      [
        "packages/alpha",
        "pnpm-lockfile-partial",
        [
          ["@fixture/beta", "unsupported"],
          ["external", "locked"],
          ["util", "locked"],
        ],
      ],
      ["packages/beta", "pnpm-lockfile-partial", []],
    ],
    unknown: true,
  });
  expect(
    await scanProject("fixtures/developer/pnpm-workspaces", target),
  ).toEqual(report);
});

it.each([
  "[]",
  '{"packages":"members/*"}',
  '{"packages":["members/good",42]}',
  '{"packages":["members/good"]}\n---\nsecret-value: true',
])("fails on malformed unsafe pnpm workspace config %s", async (workspace) => {
  const path = await root({ name: "workspace-root", private: true }, workspace);
  await lock(path, {
    lockfileVersion: "9.0",
    importers: { ".": {} },
  });
  const result = spawnSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      path,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
  expect({
    code: result.status,
    stdout: result.stdout,
    diagnostic: result.stderr.includes("pnpm-workspace.yaml"),
    sourceLeak: result.stderr.includes("secret-value"),
  }).toEqual({ code: 1, stdout: "", diagnostic: true, sourceLeak: false });
});

it("emits identical schema-valid pnpm workspace graphs through CLI and core", async () => {
  const path = await root(
    { name: "workspace-root", private: true },
    { packages: ["members/alpha"] },
  );
  await workspace(path, "members/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await lock(path, {
    lockfileVersion: "9.0",
    importers: {
      ".": {},
      "members/alpha": {
        dependencies: {
          external: { specifier: "^1", version: "1.0.0" },
        },
      },
    },
    packages: { "external@1.0.0": {} },
    snapshots: { "external@1.0.0": {} },
  });
  const report = await scanProject(path, target);
  const raw = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      path,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  expect({
    cli: JSON.parse(raw),
    repeat: await scanProject(path, target),
    valid: new Ajv().compile(schema)(report),
  }).toEqual({ cli: report, repeat: report, valid: true });
});

it("schema rejects pnpm module coverage mismatches", async () => {
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  const path = await root(
    { name: "workspace-root", private: true },
    { packages: ["members/alpha"] },
  );
  await workspace(path, "members/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
  });
  await lock(path, {
    lockfileVersion: "9.0",
    importers: { ".": {}, "members/alpha": {} },
  });
  const report = await scanProject(path, target);
  const invalid = structuredClone(report);
  if (!invalid.modules) throw new Error("Expected a pnpm workspace module");
  invalid.modules = invalid.modules.map((module) => ({
    ...module,
    coverage: "npm-lockfile-partial",
  })) as typeof invalid.modules;
  expect(new Ajv().compile(schema)(invalid)).toBe(false);
});

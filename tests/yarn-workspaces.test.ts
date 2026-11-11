import { execFileSync } from "node:child_process";
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
import { Ajv } from "ajv";
import { afterEach, expect, it } from "vitest";
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};
const roots: string[] = [];

async function root(manifest: Record<string, unknown>, lockfile: string) {
  const path = await mkdtemp(join(tmpdir(), "arkcompat-yarn-workspaces-"));
  roots.push(path);
  await writeFile(
    join(path, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
  await writeFile(join(path, "yarn.lock"), lockfile);
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

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

const classicLock = `# yarn lockfile v1

devtool@^1:
  version "1.1.0"

external@^1:
  version "1.0.0"
  dependencies:
    util "^2"

util@^2:
  version "2.0.0"
`;

it("inventories Classic workspace declarations and scopes exact lock edges", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/*"],
  };
  const path = await root(manifest, classicLock);
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: {
      "@fixture/beta": "^1.0.0",
      external: "^1",
    },
    devDependencies: { devtool: "^1" },
  });
  await workspace(path, "packages/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
  });

  const report = await scanProject(path, target);

  expect(
    report.modules?.map((module) => [
      module.kind,
      module.path,
      module.coverage,
      module.dependencies.map((dependency) => dependency.name),
    ]),
  ).toEqual([
    [
      "yarn",
      "packages/alpha",
      "yarn-classic-lockfile-partial",
      ["@fixture/beta", "external", "devtool"],
    ],
    ["yarn", "packages/beta", "yarn-classic-lockfile-partial", []],
  ]);
  expect(report.modules?.[0]?.dependencyGraph).toEqual({
    source: "yarn.lock",
    lockfileVersion: 1,
    nodes: [
      {
        id: "yarn:devtool@^1",
        installName: "devtool",
        name: "devtool",
        version: "1.1.0",
        link: false,
      },
      {
        id: "yarn:external@^1",
        installName: "external",
        name: "external",
        version: "1.0.0",
        link: false,
      },
      {
        id: "yarn:util@^2",
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
        specifier: "^1.0.0",
        section: "dependencies",
        to: null,
        resolution: "unsupported",
      },
      {
        from: "",
        name: "external",
        specifier: "^1",
        section: "dependencies",
        to: "yarn:external@^1",
        resolution: "locked",
      },
      {
        from: "",
        name: "devtool",
        specifier: "^1",
        section: "devDependencies",
        to: "yarn:devtool@^1",
        resolution: "locked",
      },
      {
        from: "yarn:external@^1",
        name: "util",
        specifier: "^2",
        section: "dependencies",
        to: "yarn:util@^2",
        resolution: "locked",
      },
    ],
  });
  expect(report.coverage.limitations).toContainEqual({
    code: "yarn-classic-workspace-link-not-recorded",
    path: "@fixture/beta",
  });
});

it("keeps a recorded Classic workspace target visible when its version contradicts the manifest range", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/alpha"],
  };
  const path = await root(
    manifest,
    '# yarn lockfile v1\n\n"external@^2.0.0":\n  version "1.9.0"\n',
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^2.0.0" },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "external",
      specifier: "^2.0.0",
      section: "dependencies",
      to: "yarn:external@^2.0.0",
      resolution: "mismatch",
    },
  ]);
  expect(report.coverage.limitations).toContainEqual({
    code: "dependency-range-mismatch",
    path: "package.json",
  });
});

it("does not mistake a same-name registry descriptor for a Classic workspace link", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["packages/*"],
    },
    `# yarn lockfile v1

"@fixture/beta@^1.0.0":
  version "1.0.0"
`,
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { "@fixture/beta": "^1.0.0" },
  });
  await workspace(path, "packages/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
  });

  const report = await scanProject(path, target);
  const alpha = report.modules?.find(
    (module) => module.path === "packages/alpha",
  );

  expect(alpha?.dependencyGraph).toEqual({
    source: "yarn.lock",
    lockfileVersion: 1,
    nodes: [],
    edges: [
      {
        from: "",
        name: "@fixture/beta",
        specifier: "^1.0.0",
        section: "dependencies",
        to: null,
        resolution: "unsupported",
      },
    ],
  });
  expect(report.coverage.limitations).toContainEqual({
    code: "yarn-classic-workspace-link-not-recorded",
    path: "@fixture/beta",
  });
});

const berryLock = `__metadata:
  version: 8
  cacheKey: fixture

"@fixture/alpha@workspace:packages/alpha":
  version: 0.0.0-use.local
  resolution: "@fixture/alpha@workspace:packages/alpha"
  dependencies:
    "@fixture/beta": "workspace:^"
    external: "npm:^1"
  linkType: soft

"@fixture/beta@workspace:^, @fixture/beta@workspace:packages/beta":
  version: 0.0.0-use.local
  resolution: "@fixture/beta@workspace:packages/beta"
  dependencies:
    shared: "npm:^1"
  linkType: soft

"external@npm:^1":
  version: 1.0.0
  resolution: "external@npm:1.0.0"
  dependencies:
    shared: "npm:~1"
  linkType: hard

"shared@npm:^1, shared@npm:~1":
  version: 1.2.0
  resolution: "shared@npm:1.2.0"
  linkType: hard

"workspace-root@workspace:.":
  version: 0.0.0-use.local
  resolution: "workspace-root@workspace:."
  linkType: soft
`;

it("links selected Berry workspace descriptors without loading Yarn plugins", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/*"],
  };
  const path = await root(manifest, berryLock);
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: {
      "@fixture/beta": "workspace:^",
      external: "^1",
    },
  });
  await workspace(path, "packages/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
    dependencies: { shared: "^1" },
  });

  const report = await scanProject(path, target);

  expect(
    report.modules?.map((module) => [
      module.kind,
      module.path,
      module.coverage,
      module.dependencies.map((dependency) => dependency.name),
    ]),
  ).toEqual([
    [
      "yarn",
      "packages/alpha",
      "yarn-berry-lockfile-partial",
      ["@fixture/beta", "external"],
    ],
    ["yarn", "packages/beta", "yarn-berry-lockfile-partial", ["shared"]],
  ]);
  expect(report.modules?.[0]?.dependencyGraph.nodes).toEqual([
    {
      id: "yarn-berry-workspace:packages/beta",
      installName: "@fixture/beta",
      name: "@fixture/beta",
      version: "1.0.0",
      link: true,
    },
    {
      id: "yarn-berry:external@npm:^1",
      installName: "external",
      name: "external",
      version: "1.0.0",
      link: false,
    },
    {
      id: "yarn-berry:shared@npm:^1",
      installName: "shared",
      name: "shared",
      version: "1.2.0",
      link: false,
    },
    {
      id: "yarn-berry:shared@npm:~1",
      installName: "shared",
      name: "shared",
      version: "1.2.0",
      link: false,
    },
  ]);
  expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "@fixture/beta",
      specifier: "workspace:^",
      section: "dependencies",
      to: "yarn-berry-workspace:packages/beta",
      resolution: "locked",
    },
    {
      from: "",
      name: "external",
      specifier: "^1",
      section: "dependencies",
      to: "yarn-berry:external@npm:^1",
      resolution: "locked",
    },
    {
      from: "yarn-berry-workspace:packages/beta",
      name: "shared",
      specifier: "^1",
      section: "dependencies",
      to: "yarn-berry:shared@npm:^1",
      resolution: "locked",
    },
    {
      from: "yarn-berry:external@npm:^1",
      name: "shared",
      specifier: "npm:~1",
      section: "dependencies",
      to: "yarn-berry:shared@npm:~1",
      resolution: "locked",
    },
  ]);
});

it("keeps a recorded Berry workspace target visible when its version contradicts the manifest range", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/alpha"],
  };
  const path = await root(
    manifest,
    `__metadata:
  version: 8

"@fixture/alpha@workspace:packages/alpha":
  version: 0.0.0-use.local
  resolution: "@fixture/alpha@workspace:packages/alpha"
  dependencies:
    external: "npm:^2.0.0"
  linkType: soft

"external@npm:^2.0.0":
  version: 1.9.0
  resolution: "external@npm:1.9.0"
  linkType: hard

"workspace-root@workspace:.":
  version: 0.0.0-use.local
  resolution: "workspace-root@workspace:."
  linkType: soft
`,
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^2.0.0" },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "external",
      specifier: "^2.0.0",
      section: "dependencies",
      to: "yarn-berry:external@npm:^2.0.0",
      resolution: "mismatch",
    },
  ]);
  expect(report.coverage.limitations).toContainEqual({
    code: "dependency-range-mismatch",
    path: "package.json",
  });
});

it("keeps stale, anonymous, duplicate and unsafe Yarn workspaces declarations-only", async () => {
  const manifest = {
    private: true,
    workspaces: [
      "members/*",
      "../outside-secret",
      "https://secret.invalid/workspace",
      "members/[stale,anonymous]",
    ],
  };
  const path = await root(manifest, berryLock);
  await workspace(path, "members/stale", {
    name: "@fixture/stale",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await workspace(path, "members/anonymous", { version: "1.0.0" });
  await workspace(path, "members/duplicate-a", {
    name: "@fixture/duplicate",
    version: "1.0.0",
  });
  await workspace(path, "members/duplicate-b", {
    name: "@fixture/duplicate",
    version: "2.0.0",
  });
  await symlink(path, join(path, "members", "linked"));

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
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "yarn-workspace-name-duplicate",
        path: "members/duplicate-a/package.json",
      },
      {
        code: "yarn-workspace-name-missing",
        path: "members/anonymous/package.json",
      },
      {
        code: "yarn-berry-workspace-lock-entry-missing",
        path: "@fixture/stale",
      },
      { code: "yarn-workspace-directory-unavailable", path: "members/linked" },
      { code: "yarn-workspace-pattern-unsafe" },
      { code: "yarn-workspace-pattern-unsupported" },
    ]),
  );
  expect(JSON.stringify(report)).not.toMatch(/outside-secret|secret\.invalid/);
});

it("expands bounded comma-list braces in Yarn workspace selections", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["members/{alpha,group-{a,b}/*}"],
    },
    classicLock,
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

  const report = await scanProject(path, target);

  expect(report.modules?.map((module) => module.path)).toEqual([
    "members/alpha",
    "members/group-a/beta",
    "members/group-b/gamma",
  ]);
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "yarn-workspace-pattern-unsupported",
  );
});

it("keeps missing, peer and versionless module edges explicit", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["packages/alpha"],
    },
    `# yarn lockfile v1

versionless@^1:
`,
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: {
      absent: "^1",
      versionless: "^1",
    },
    peerDependencies: { host: "^1" },
  });

  const report = await scanProject(path, target);

  expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "absent",
      specifier: "^1",
      section: "dependencies",
      to: null,
      resolution: "missing",
    },
    {
      from: "",
      name: "versionless",
      specifier: "^1",
      section: "dependencies",
      to: null,
      resolution: "unsupported",
    },
    {
      from: "",
      name: "host",
      specifier: "^1",
      section: "peerDependencies",
      to: null,
      resolution: "unsupported",
    },
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      { code: "dependency-edge-missing", path: "package.json" },
      { code: "dependency-edge-unsupported", path: "package.json" },
    ]),
  );
});

it("fails closed for unparsed Yarn locks and missing workspace versions", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["packages/*"],
    },
    "# yarn lockfile v2\n",
  );
  await workspace(path, "packages/versioned", {
    name: "@fixture/versioned",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await workspace(path, "packages/versionless", {
    name: "@fixture/versionless",
  });

  const report = await scanProject(path, target);

  expect(
    report.modules?.map((module) => [
      module.path,
      module.coverage,
      module.dependencyGraph.edges.length,
    ]),
  ).toEqual([
    ["packages/versioned", "declarations-only", 0],
    ["packages/versionless", "declarations-only", 0],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "yarn-workspace-lock-not-parsed",
        path: "packages/versioned/package.json",
      },
      {
        code: "yarn-workspace-version-missing",
        path: "packages/versionless/package.json",
      },
      { code: "unsupported-yarn-lockfile-version", path: "yarn.lock" },
    ]),
  );
});

it("inventories declared Yarn workspaces when the lockfile is missing", async () => {
  const path = await mkdtemp(join(tmpdir(), "arkcompat-yarn-workspaces-"));
  roots.push(path);
  await writeFile(
    join(path, "package.json"),
    JSON.stringify({
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      packageManager: "yarn@4.0.0",
      workspaces: ["packages/alpha"],
    }),
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });

  const report = await scanProject(path, target);

  expect(report.modules?.[0]).toMatchObject({
    kind: "yarn",
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
    code: "yarn-workspace-lock-not-parsed",
    path: "packages/alpha/package.json",
  });
});

it("rejects unsafe Berry workspace descriptors and stale manifest metadata", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["members/*"],
    },
    `__metadata:
  version: 8
  cacheKey: fixture

"@fixture/stale@workspace:members/stale":
  version: 0.0.0-use.local
  resolution: "@fixture/stale@workspace:members/stale"
  dependencies:
    external: "npm:^2"
  linkType: soft

"@fixture/unsafe@workspace:../outside-secret":
  version: 0.0.0-use.local
  resolution: "@fixture/unsafe@workspace:../outside-secret"
  linkType: soft
`,
  );
  await workspace(path, "members/stale", {
    name: "@fixture/stale",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await workspace(path, "members/unsafe", {
    name: "@fixture/unsafe",
    version: "1.0.0",
  });

  const report = await scanProject(path, target);

  expect(
    report.modules?.map((module) => [module.path, module.coverage]),
  ).toEqual([
    ["members/stale", "declarations-only"],
    ["members/unsafe", "declarations-only"],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "yarn-berry-workspace-descriptor-invalid",
        path: "yarn.lock",
      },
      {
        code: "yarn-berry-workspace-manifest-lock-mismatch",
        path: "members/stale/package.json",
      },
      {
        code: "yarn-berry-workspace-lock-entry-missing",
        path: "@fixture/unsafe",
      },
    ]),
  );
  expect(JSON.stringify(report)).not.toMatch(/outside-secret/);
});

it("follows transitive workspace descriptors and closes local cycles once", async () => {
  const path = await root(
    {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["packages/*"],
    },
    `__metadata:
  version: 8
  cacheKey: fixture

"@fixture/alpha@workspace:^, @fixture/alpha@workspace:packages/alpha":
  version: 0.0.0-use.local
  resolution: "@fixture/alpha@workspace:packages/alpha"
  dependencies:
    external: "npm:^1"
  linkType: soft

"@fixture/beta@workspace:^, @fixture/beta@workspace:packages/beta":
  version: 0.0.0-use.local
  resolution: "@fixture/beta@workspace:packages/beta"
  dependencies:
    "@fixture/alpha": "workspace:^"
  linkType: soft

"external@npm:^1":
  version: 1.0.0
  resolution: "external@npm:1.0.0"
  dependencies:
    "@fixture/beta": "workspace:^"
  linkType: hard

"workspace-root@workspace:.":
  version: 0.0.0-use.local
  resolution: "workspace-root@workspace:."
  linkType: soft
`,
  );
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await workspace(path, "packages/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
    dependencies: { "@fixture/alpha": "workspace:^" },
  });

  const report = await scanProject(path, target);
  const alpha = report.modules?.find(
    (module) => module.path === "packages/alpha",
  );

  expect(alpha?.dependencyGraph.nodes.map((node) => node.id)).toEqual([
    "yarn-berry-workspace:packages/alpha",
    "yarn-berry-workspace:packages/beta",
    "yarn-berry:external@npm:^1",
  ]);
  expect(alpha?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "external",
      specifier: "^1",
      section: "dependencies",
      to: "yarn-berry:external@npm:^1",
      resolution: "locked",
    },
    {
      from: "yarn-berry:external@npm:^1",
      name: "@fixture/beta",
      specifier: "workspace:^",
      section: "dependencies",
      to: "yarn-berry-workspace:packages/beta",
      resolution: "locked",
    },
    {
      from: "yarn-berry-workspace:packages/beta",
      name: "@fixture/alpha",
      specifier: "workspace:^",
      section: "dependencies",
      to: "yarn-berry-workspace:packages/alpha",
      resolution: "locked",
    },
    {
      from: "yarn-berry-workspace:packages/alpha",
      name: "external",
      specifier: "^1",
      section: "dependencies",
      to: "yarn-berry:external@npm:^1",
      resolution: "locked",
    },
  ]);
});

it("emits deterministic schema-valid Classic/CLI reports", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/alpha"],
  };
  const path = await root(manifest, classicLock);
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  const report = await scanProject(path, target);
  const cli = JSON.parse(
    execFileSync(
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
    ),
  );
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  expect({
    cli,
    repeated: await scanProject(path, target),
    valid: new Ajv().compile(schema)(report),
    unknown: report.findings.every((finding) => finding.status === "unknown"),
  }).toEqual({ cli: report, repeated: report, valid: true, unknown: true });
});

it("scans the documented authored Yarn Berry workspace fixture", async () => {
  const report = await scanProject(
    "fixtures/developer/yarn-workspaces",
    target,
  );
  expect({
    modules: report.modules?.map((module) => [
      module.kind,
      module.path,
      module.coverage,
      module.dependencyGraph.nodes.length,
      module.dependencyGraph.edges.length,
    ]),
    unknown: report.findings.every((finding) => finding.status === "unknown"),
  }).toEqual({
    modules: [
      ["yarn", "packages/alpha", "yarn-berry-lockfile-partial", 4, 4],
      ["yarn", "packages/beta", "yarn-berry-lockfile-partial", 1, 1],
    ],
    unknown: true,
  });
});

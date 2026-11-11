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

async function root(manifest: Record<string, unknown>) {
  const path = await mkdtemp(join(tmpdir(), "arkcompat-npm-workspaces-"));
  roots.push(path);
  await writeFile(
    join(path, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
  return path;
}

async function workspace(
  root: string,
  path: string,
  manifest: Record<string, unknown>,
) {
  const directory = join(root, path);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify(manifest, null, 2),
  );
}

async function lock(
  root: string,
  manifest: Record<string, unknown>,
  packages: Record<string, unknown>,
  version = 3,
) {
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify(
      {
        lockfileVersion: version,
        packages: { "": manifest, ...packages },
      },
      null,
      2,
    ),
  );
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

it.each([2, 3])(
  "inventories safe npm v%i workspace manifests and scopes recorded edges",
  async (version) => {
    const manifest = {
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      workspaces: ["packages/*"],
      dependencies: { "@fixture/alpha": "*" },
    };
    const path = await root(manifest);
    await workspace(path, "packages/alpha", {
      name: "@fixture/alpha",
      version: "1.0.0",
      dependencies: {
        "@fixture/beta": "*",
        external: "^1",
      },
      devDependencies: { devtool: "^1" },
    });
    await workspace(path, "packages/beta", {
      name: "@fixture/beta",
      version: "1.0.0",
    });
    await writeFile(join(path, "packages/alpha/package-lock.json"), "{}");
    await lock(
      path,
      manifest,
      {
        "node_modules/@fixture/alpha": {
          link: true,
          resolved: "packages/alpha",
        },
        "node_modules/@fixture/beta": {
          link: true,
          resolved: "packages/beta",
        },
        "node_modules/devtool": { version: "1.0.0" },
        "node_modules/external": { version: "2.0.0" },
        "packages/alpha": {
          name: "@fixture/alpha",
          version: "1.0.0",
          dependencies: {
            "@fixture/beta": "*",
            external: "^1",
          },
          devDependencies: { devtool: "^1" },
        },
        "packages/alpha/node_modules/external": { version: "1.9.0" },
        "packages/beta": {
          name: "@fixture/beta",
          version: "1.0.0",
        },
      },
      version,
    );
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
        "npm",
        "packages/alpha",
        "npm-lockfile-partial",
        ["@fixture/beta", "external", "devtool"],
      ],
      ["npm", "packages/beta", "npm-lockfile-partial", []],
    ]);
    expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
      {
        from: "",
        name: "@fixture/beta",
        specifier: "*",
        section: "dependencies",
        to: "node_modules/@fixture/beta",
        resolution: "unsupported",
      },
      {
        from: "",
        name: "external",
        specifier: "^1",
        section: "dependencies",
        to: "packages/alpha/node_modules/external",
        resolution: "locked",
      },
      {
        from: "",
        name: "devtool",
        specifier: "^1",
        section: "devDependencies",
        to: "node_modules/devtool",
        resolution: "locked",
      },
    ]);
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
      path: "packages/alpha/package-lock.json",
    });
  },
);

it("keeps a recorded npm workspace target visible when its version contradicts the manifest range", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/alpha"],
  };
  const path = await root(manifest);
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^2.0.0" },
  });
  await lock(path, manifest, {
    "node_modules/@fixture/alpha": {
      link: true,
      resolved: "packages/alpha",
    },
    "node_modules/external": { version: "1.9.0" },
    "packages/alpha": {
      name: "@fixture/alpha",
      version: "1.0.0",
      dependencies: { external: "^2.0.0" },
    },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]?.dependencyGraph.edges).toEqual([
    {
      from: "",
      name: "external",
      specifier: "^2.0.0",
      section: "dependencies",
      to: "node_modules/external",
      resolution: "mismatch",
    },
  ]);
  expect(report.coverage.limitations).toContainEqual({
    code: "dependency-range-mismatch",
    path: "node_modules/@fixture/alpha",
  });
});

it("keeps ambiguous, stale and missing workspace lock records explicit", async () => {
  const manifest = {
    private: true,
    workspaces: ["packages/*"],
  };
  const path = await root(manifest);
  await workspace(path, "packages/alpha-a", {
    name: "@fixture/duplicate",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await workspace(path, "packages/alpha-b", {
    name: "@fixture/duplicate",
    version: "2.0.0",
  });
  await workspace(path, "packages/stale", {
    name: "@fixture/stale",
    version: "1.0.0",
    dependencies: { changed: "^1" },
  });
  await workspace(path, "packages/unlocked", {
    name: "@fixture/unlocked",
    version: "1.0.0",
    dependencies: { missing: "^1" },
  });
  await lock(path, manifest, {
    "node_modules/@fixture/duplicate": {
      link: true,
      resolved: "packages/alpha-a",
    },
    "node_modules/@fixture/stale": {
      link: true,
      resolved: "packages/stale",
    },
    "node_modules/external": { version: "1.0.0" },
    "packages/alpha-a": {
      name: "@fixture/duplicate",
      version: "1.0.0",
      dependencies: { external: "^1" },
    },
    "packages/alpha-b": {
      name: "@fixture/duplicate",
      version: "2.0.0",
    },
    "packages/stale": {
      name: "@fixture/stale",
      version: "1.0.0",
      dependencies: { unchanged: "^1" },
    },
  });
  const report = await scanProject(path, target);
  expect(
    report.modules?.map((module) => [
      module.path,
      module.coverage,
      module.dependencyGraph.edges.length,
    ]),
  ).toEqual([
    ["packages/alpha-a", "declarations-only", 0],
    ["packages/alpha-b", "declarations-only", 0],
    ["packages/stale", "declarations-only", 0],
    ["packages/unlocked", "declarations-only", 0],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "npm-workspace-name-duplicate",
        path: "packages/alpha-b/package.json",
      },
      {
        code: "npm-workspace-lock-entry-missing",
        path: "packages/unlocked/package.json",
      },
      {
        code: "npm-workspace-lock-metadata-mismatch",
        path: "packages/stale/package.json",
      },
    ]),
  );
});

it("fails closed on unsafe or unsupported workspace selections without leaking targets", async () => {
  const manifest = {
    private: true,
    workspaces: [
      "packages/good",
      "../outside-secret",
      "/private-secret",
      "https://secret.invalid/workspace",
      "packages/[good,broken]",
    ],
  };
  const path = await root(manifest);
  await workspace(path, "packages/good", {
    name: "@fixture/good",
    version: "1.0.0",
  });
  await lock(path, manifest, {
    "node_modules/@fixture/good": {
      link: true,
      resolved: "packages/good",
    },
    "packages/good": {
      name: "@fixture/good",
      version: "1.0.0",
    },
  });
  const report = await scanProject(path, target);
  expect(
    report.modules?.map((module) => [module.path, module.coverage]),
  ).toEqual([["packages/good", "npm-lockfile-partial"]]);
  expect(report.coverage.limitations.map((item) => item.code)).toEqual(
    expect.arrayContaining([
      "npm-workspace-pattern-unsafe",
      "npm-workspace-pattern-unsupported",
    ]),
  );
  expect(JSON.stringify(report)).not.toMatch(/outside-secret|secret\.invalid/);
});

it("resolves bounded workspace globstars across nested manifest directories", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/**"],
  };
  const path = await root(manifest);
  await workspace(path, "packages/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
  });
  await workspace(path, "packages/nested/beta", {
    name: "@fixture/beta",
    version: "1.0.0",
  });
  await mkdir(join(path, "packages/nested/not-a-workspace"), {
    recursive: true,
  });
  const outside = await root({ name: "@fixture/outside" });
  await symlink(outside, join(path, "packages/nested/linked"));

  const report = await scanProject(path, target);

  expect(
    report.modules?.map((module) => [module.path, module.coverage]),
  ).toEqual([
    ["packages/alpha", "declarations-only"],
    ["packages/nested/beta", "declarations-only"],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "npm-workspace-directory-unavailable",
        path: "packages/nested/linked",
      },
      {
        code: "npm-workspace-lock-entry-missing",
        path: "packages/alpha/package.json",
      },
      {
        code: "npm-workspace-lock-entry-missing",
        path: "packages/nested/beta/package.json",
      },
    ]),
  );
  expect(report.coverage.limitations).not.toContainEqual({
    code: "npm-workspace-manifest-missing",
    path: "packages/nested/not-a-workspace/package.json",
  });
});

it("supports intermediate globstars with zero or multiple directory segments", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/**/components/*"],
  };
  const path = await root(manifest);
  await workspace(path, "packages/components/direct", {
    name: "@fixture/direct",
    version: "1.0.0",
  });
  await workspace(path, "packages/team-a/components/nested", {
    name: "@fixture/nested",
    version: "1.0.0",
  });
  await mkdir(join(path, "packages/node_modules/components/ignored"), {
    recursive: true,
  });

  const report = await scanProject(path, target);

  expect(report.modules?.map((module) => module.path)).toEqual([
    "packages/components/direct",
    "packages/team-a/components/nested",
  ]);
  expect(JSON.stringify(report)).not.toContain(
    "packages/node_modules/components/ignored",
  );
});

it("matches bounded segment wildcards, single characters and character classes", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: [
      "modules/[ab]-app",
      "modules/service-?",
      "modules/team-[!a]/member",
      "modules/feature-*",
    ],
  };
  const path = await root(manifest);
  const selected = [
    "modules/a-app",
    "modules/b-app",
    "modules/service-x",
    "modules/service-y",
    "modules/team-b/member",
    "modules/team-c/member",
    "modules/feature-one",
    "modules/feature-two",
  ];
  const excluded = [
    "modules/c-app",
    "modules/service-xy",
    "modules/team-a/member",
    "modules/other",
  ];
  for (const workspacePath of [...selected, ...excluded]) {
    await workspace(path, workspacePath, {
      name: `@fixture/${workspacePath.replaceAll("/", "-")}`,
      version: "1.0.0",
    });
  }

  const report = await scanProject(path, target);

  expect(report.modules?.map((module) => module.path)).toEqual(
    [...selected].sort(),
  );
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "npm-workspace-pattern-unsupported",
  );
});

it("expands bounded comma-list braces across workspace alternatives", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: ["{apps/alpha,packages/team-{a,b}/*}"],
  };
  const path = await root(manifest);
  await workspace(path, "apps/alpha", {
    name: "@fixture/app-alpha",
    version: "1.0.0",
  });
  await workspace(path, "packages/team-a/beta", {
    name: "@fixture/team-a-beta",
    version: "1.0.0",
  });
  await workspace(path, "packages/team-b/gamma", {
    name: "@fixture/team-b-gamma",
    version: "1.0.0",
  });
  await workspace(path, "packages/other/delta", {
    name: "@fixture/other-delta",
    version: "1.0.0",
  });

  const report = await scanProject(path, target);

  expect(report.modules?.map((module) => module.path)).toEqual([
    "apps/alpha",
    "packages/team-a/beta",
    "packages/team-b/gamma",
  ]);
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "npm-workspace-pattern-unsupported",
  );
});

it("expands bounded numeric and alphabetic brace sequences", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: [
      "modules/numeric-{01..03}",
      "modules/alpha-{a..c..2}",
      "modules/reverse-{3..1}",
    ],
  };
  const path = await root(manifest);
  const workspaces: Array<[string, string]> = [
    ["modules/numeric-01", "@fixture/numeric-01"],
    ["modules/numeric-02", "@fixture/numeric-02"],
    ["modules/numeric-03", "@fixture/numeric-03"],
    ["modules/alpha-a", "@fixture/alpha-a"],
    ["modules/alpha-c", "@fixture/alpha-c"],
    ["modules/reverse-3", "@fixture/reverse-3"],
    ["modules/reverse-2", "@fixture/reverse-2"],
    ["modules/reverse-1", "@fixture/reverse-1"],
    ["modules/numeric-04", "@fixture/numeric-04"],
  ];
  for (const [workspacePath, name] of workspaces) {
    await workspace(path, workspacePath, { name, version: "1.0.0" });
  }

  const report = await scanProject(path, target);

  expect(report.modules?.map((module) => module.path)).toEqual([
    "modules/alpha-a",
    "modules/alpha-c",
    "modules/numeric-01",
    "modules/numeric-02",
    "modules/numeric-03",
    "modules/reverse-1",
    "modules/reverse-2",
    "modules/reverse-3",
  ]);
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "npm-workspace-pattern-unsupported",
  );
});

it("scans the documented workspace sequence fixture deterministically", async () => {
  const fixture = "fixtures/developer/workspace-sequences";
  const report = await scanProject(fixture, target);
  expect(report).toEqual(await scanProject(fixture, target));
  expect(report.modules?.map((module) => module.path)).toEqual([
    "modules/alpha-a",
    "modules/alpha-c",
    "modules/numeric-01",
    "modules/numeric-02",
    "modules/numeric-03",
    "modules/reverse-1",
    "modules/reverse-2",
    "modules/reverse-3",
  ]);
  expect(report.findings).toHaveLength(1);
  expect(report.findings[0]?.status).toBe("unknown");
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "npm-workspace-pattern-unsupported",
  );
});

it("scans the documented workspace character-glob fixture deterministically", async () => {
  const fixture = "fixtures/developer/workspace-character-globs";
  const report = await scanProject(fixture, target);
  expect(report).toEqual(await scanProject(fixture, target));
  expect(report.modules?.map((module) => module.path)).toEqual([
    "modules/a-app",
    "modules/b-app",
    "modules/feature-one",
    "modules/feature-two",
    "modules/service-x",
    "modules/service-y",
    "modules/team-b/member",
    "modules/team-c/member",
  ]);
  expect(report.findings).toHaveLength(1);
  expect(report.findings[0]?.status).toBe("unknown");
  expect(report.coverage.limitations.map((item) => item.code)).not.toContain(
    "npm-workspace-pattern-unsupported",
  );
});

it("fails closed on malformed braces and bounded expansion overflow", async () => {
  const manifest = {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    workspaces: [
      "packages/[ab]",
      "packages/[ab",
      "packages/description-????????????????????????????????????????????????",
      "packages/range-[z-a]",
      "packages/{alpha,}",
      "packages/{x..}",
      "packages/{alpha",
      "packages/alpha}",
      "{0,1}{0,1}{0,1}{0,1}{0,1}{0,1}{0,1}",
    ],
  };
  const path = await root(manifest);

  const report = await scanProject(path, target);

  expect(report.modules).toBeUndefined();
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      { code: "npm-workspace-pattern-unsupported" },
      { code: "npm-workspace-limit-exceeded" },
    ]),
  );
  expect(JSON.stringify(report)).not.toContain("packages/{");
  expect(JSON.stringify(report)).not.toContain("{0,1}");
});

it("skips symlinked workspace directories and stays within the workspace cap", async () => {
  const workspaces = [
    "packages/w0",
    "packages/linked",
    ...Array.from({ length: 128 }, (_, index) => `packages/w${index + 1}`),
  ];
  const manifest = { private: true, workspaces };
  const path = await root(manifest);
  await workspace(path, "packages/w0", {
    name: "@fixture/zero",
    version: "1.0.0",
  });
  const outside = await root({ private: true });
  await symlink(outside, join(path, "packages", "linked"));
  await lock(path, manifest, {
    "node_modules/@fixture/zero": {
      link: true,
      resolved: "packages/w0",
    },
    "packages/w0": {
      name: "@fixture/zero",
      version: "1.0.0",
    },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.map((module) => module.path)).toEqual(["packages/w0"]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      { code: "npm-workspace-directory-unavailable", path: "packages/linked" },
      { code: "npm-workspace-limit-exceeded" },
    ]),
  );
});

it("supports bounded workspace objects while disclosing nohoist and wildcard gaps", async () => {
  const manifest = {
    private: true,
    workspaces: {
      packages: ["members/*", "./members/good", "missing/*"],
      nohoist: ["external"],
    },
  };
  const path = await root(manifest);
  await workspace(path, "members/good", {
    name: "@fixture/good",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await writeFile(join(path, "members", "not-a-directory"), "fixture");
  const outside = await root({ private: true });
  await symlink(outside, join(path, "members", "linked"));
  const report = await scanProject(path, target);
  expect(
    report.modules?.map((module) => [module.path, module.coverage]),
  ).toEqual([["members/good", "declarations-only"]]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      { code: "npm-workspace-nohoist-not-analyzed" },
      {
        code: "npm-workspace-directory-unavailable",
        path: "members/linked",
      },
      {
        code: "npm-workspace-directory-unavailable",
        path: "missing",
      },
      {
        code: "npm-workspace-lock-entry-missing",
        path: "members/good/package.json",
      },
    ]),
  );
});

it("keeps missing, symlinked and anonymous workspace manifests outside lock attribution", async () => {
  const manifest = {
    private: true,
    workspaces: [
      "members/missing-manifest",
      "members/linked-manifest",
      "members/anonymous",
    ],
  };
  const path = await root(manifest);
  await mkdir(join(path, "members/missing-manifest"), { recursive: true });
  await mkdir(join(path, "members/linked-manifest"), { recursive: true });
  const outside = await root({ name: "@fixture/outside" });
  await symlink(
    join(outside, "package.json"),
    join(path, "members/linked-manifest/package.json"),
  );
  await workspace(path, "members/anonymous", { version: "1.0.0" });
  const report = await scanProject(path, target);
  expect(
    report.modules?.map((module) => [module.path, module.coverage]),
  ).toEqual([["members/anonymous", "declarations-only"]]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "npm-workspace-manifest-missing",
        path: "members/missing-manifest/package.json",
      },
      {
        code: "npm-workspace-manifest-not-regular",
        path: "members/linked-manifest/package.json",
      },
      {
        code: "npm-workspace-name-missing",
        path: "members/anonymous/package.json",
      },
    ]),
  );
});

it.each(["[]", '{"dependencies":[]}'])(
  "fails on an invalid selected workspace manifest %s",
  async (workspaceManifest) => {
    const manifest = { private: true, workspaces: ["members/bad"] };
    const path = await root(manifest);
    const directory = join(path, "members/bad");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "package.json"), workspaceManifest);
    await expect(scanProject(path, target)).rejects.toThrow(
      /members\/bad\/package\.json/,
    );
  },
);

it.each([
  { workspaces: null },
  { workspaces: {} },
  { workspaces: [1] },
  { workspaces: { packages: "members/*" } },
])("fails on malformed workspace selection %j", async (workspaces) => {
  await expect(
    scanProject(await root({ private: true, ...workspaces }), target),
  ).rejects.toThrow(/workspaces/);
});

it("projects transitive cycles and unresolved edges inside a workspace scope", async () => {
  const manifest = { private: true, workspaces: ["members/alpha"] };
  const path = await root(manifest);
  await workspace(path, "members/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { "dep-a": "^1", missing: "*" },
  });
  await lock(path, manifest, {
    "members/alpha": {
      name: "@fixture/alpha",
      version: "1.0.0",
      dependencies: { "dep-a": "^1", missing: "*" },
    },
    "node_modules/@fixture/alpha": {
      link: true,
      resolved: "members/alpha",
    },
    "node_modules/dep-a": {
      version: "1.0.0",
      dependencies: { "dep-b": "^1" },
    },
    "node_modules/dep-b": {
      version: "1.0.0",
      dependencies: { "dep-a": "^1" },
    },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]?.dependencyGraph).toMatchObject({
    nodes: [
      { id: "node_modules/dep-a", name: "dep-a", version: "1.0.0" },
      { id: "node_modules/dep-b", name: "dep-b", version: "1.0.0" },
    ],
    edges: [
      {
        from: "",
        name: "dep-a",
        to: "node_modules/dep-a",
        resolution: "locked",
      },
      { from: "", name: "missing", to: null, resolution: "missing" },
      {
        from: "node_modules/dep-a",
        name: "dep-b",
        to: "node_modules/dep-b",
        resolution: "locked",
      },
      {
        from: "node_modules/dep-b",
        name: "dep-a",
        to: "node_modules/dep-a",
        resolution: "locked",
      },
    ],
  });
});

it("does not choose among multiple lock aliases for one workspace", async () => {
  const manifest = {
    private: true,
    workspaces: ["members/alpha"],
  };
  const path = await root(manifest);
  await workspace(path, "members/alpha", {
    name: "@fixture/alpha",
    version: "1.0.0",
    dependencies: { external: "^1" },
  });
  await lock(path, manifest, {
    "node_modules/@fixture/alpha": {
      link: true,
      resolved: "members/alpha",
    },
    "node_modules/alias-alpha": {
      link: true,
      resolved: "members/alpha",
    },
    "node_modules/external": { version: "1.0.0" },
    "members/alpha": {
      name: "@fixture/alpha",
      version: "1.0.0",
      dependencies: { external: "^1" },
    },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]).toMatchObject({
    coverage: "declarations-only",
    dependencyGraph: { nodes: [], edges: [] },
  });
  expect(report.coverage.limitations).toContainEqual({
    code: "npm-workspace-link-ambiguous",
    path: "members/alpha/package.json",
  });
});

it("withholds lock projection when a workspace has no version", async () => {
  const manifest = { private: true, workspaces: ["members/versionless"] };
  const path = await root(manifest);
  await workspace(path, "members/versionless", {
    name: "@fixture/versionless",
  });
  await lock(path, manifest, {
    "node_modules/@fixture/versionless": {
      link: true,
      resolved: "members/versionless",
    },
    "members/versionless": {
      name: "@fixture/versionless",
      version: "1.0.0",
    },
  });
  const report = await scanProject(path, target);
  expect(report.modules?.[0]).toMatchObject({
    coverage: "declarations-only",
    dependencyGraph: { nodes: [], edges: [] },
  });
  expect(report.coverage.limitations).toContainEqual({
    code: "npm-workspace-version-missing",
    path: "members/versionless/package.json",
  });
});

it("schema rejects npm/OHPM module coverage mismatches", async () => {
  const report = await scanProject("fixtures/developer/npm-workspaces", target);
  const schema = JSON.parse(
    await readFile(
      new URL("../packages/contracts/scan-report.schema.json", import.meta.url),
      "utf8",
    ),
  ) as object;
  const invalid = {
    ...report,
    modules: report.modules?.map((module) => ({
      ...module,
      coverage: "ohpm-lockfile-partial",
    })),
  };
  expect(new Ajv().compile(schema)(invalid)).toBe(false);
});

it("scans the documented npm workspace fixture deterministically", async () => {
  const report = await scanProject("fixtures/developer/npm-workspaces", target);
  expect(report).toEqual(
    await scanProject("fixtures/developer/npm-workspaces", target),
  );
  expect(
    report.modules?.map((module) => ({
      path: module.path,
      coverage: module.coverage,
      edges: module.dependencyGraph.edges.map((edge) => [
        edge.name,
        edge.to,
        edge.resolution,
      ]),
    })),
  ).toEqual([
    {
      path: "packages/alpha",
      coverage: "npm-lockfile-partial",
      edges: [
        ["@fixture/beta", "node_modules/@fixture/beta", "unsupported"],
        ["external", "packages/alpha/node_modules/external", "locked"],
        ["devtool", "node_modules/devtool", "locked"],
      ],
    },
    {
      path: "packages/beta",
      coverage: "npm-lockfile-partial",
      edges: [],
    },
  ]);
});

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
  release: "6.0.0",
  runtime: "arkts",
};
const roots: string[] = [];
async function fixture(
  body: string,
  manifest: unknown = {},
  header = "# yarn lockfile v1\n",
) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-yarn-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(join(root, "yarn.lock"), header + body);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("expands grouped selectors and resolves exact direct/transitive descriptors", async () => {
  const root = await fixture(
    'a@^1:\n  version "1.0.0"\n  dependencies:\n    shared "~1"\nb@^1:\n  version "1.0.0"\n  dependencies:\n    shared "^1"\n"shared@^1", "shared@~1":\n  version "1.2.0"\n',
    { dependencies: { a: "^1", b: "^1" } },
  );
  const graph = (await scanProject(root, target)).dependencyGraph;
  expect({
    nodes: graph.nodes.map((n) => n.id),
    edges: graph.edges.map((e) => [e.from, e.name, e.to, e.resolution]),
  }).toEqual({
    nodes: ["yarn:a@^1", "yarn:b@^1", "yarn:shared@^1", "yarn:shared@~1"],
    edges: [
      ["", "a", "yarn:a@^1", "locked"],
      ["", "b", "yarn:b@^1", "locked"],
      ["yarn:a@^1", "shared", "yarn:shared@~1", "locked"],
      ["yarn:b@^1", "shared", "yarn:shared@^1", "locked"],
    ],
  });
});
it("retains separate selectors with conflicting locked versions", async () => {
  const root = await fixture(
    '"a@^1":\n  version "1.0.0"\n"a@^2":\n  version "2.0.0"\n',
    { dependencies: { a: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.nodes.map((n) => [
      n.id,
      n.version,
    ]),
  ).toEqual([
    ["yarn:a@^1", "1.0.0"],
    ["yarn:a@^2", "2.0.0"],
  ]);
});
it("retains scoped alias identity without pretending it is an installed path", async () => {
  const root = await fixture(
    '"alias@npm:@scope/real@^2":\n  version "2.1.0"\n',
    { dependencies: { alias: "npm:@scope/real@^2" } },
  );
  expect((await scanProject(root, target)).dependencyGraph.nodes).toEqual([
    {
      id: "yarn:alias@npm:@scope/real@^2",
      installName: "alias",
      name: "@scope/real",
      version: "2.1.0",
      link: false,
    },
  ]);
});
it("does not resolve a missing descriptor by matching its package name or locked version", async () => {
  const root = await fixture('a@^1:\n  version "9.0.0"\n', {
    dependencies: { a: "^9" },
  });
  expect(
    (await scanProject(root, target)).dependencyGraph.edges[0],
  ).toMatchObject({ resolution: "missing", to: null });
});
it("marks a recorded Classic descriptor whose version contradicts its semver range", async () => {
  const root = await fixture(
    'a@^1.0.0:\n  version "1.0.0"\n  dependencies:\n    child ">=2.0.0 <3.0.0"\n"child@>=2.0.0 <3.0.0":\n  version "1.9.0"\n',
    { dependencies: { a: "^1.0.0" } },
  );
  const report = await scanProject(root, target);
  expect(
    report.dependencyGraph.edges.map((edge) => [
      edge.from,
      edge.name,
      edge.resolution,
      edge.to,
    ]),
  ).toEqual([
    ["", "a", "locked", "yarn:a@^1.0.0"],
    ["yarn:a@^1.0.0", "child", "mismatch", "yarn:child@>=2.0.0 <3.0.0"],
  ]);
  expect(report.coverage.limitations).toContainEqual({
    code: "dependency-range-mismatch",
    path: "yarn:a@^1.0.0",
  });
});
it("exposes local references and root peer installation as unsupported", async () => {
  const root = await fixture('peer@^1:\n  version "1.0.0"\n', {
    dependencies: { local: "file:../local" },
    peerDependencies: { peer: "^1" },
  });
  expect(
    (await scanProject(root, target)).dependencyGraph.edges.map((e) => [
      e.name,
      e.section,
      e.resolution,
      e.to,
    ]),
  ).toEqual([
    ["local", "dependencies", "unsupported", null],
    ["peer", "peerDependencies", "unsupported", null],
  ]);
});
it("uses effective optional overrides and retains missing optional edges", async () => {
  const root = await fixture(
    'a@^2:\n  version "2.0.0"\n  optionalDependencies:\n    native "^1"\n',
    { dependencies: { a: "^1" }, optionalDependencies: { a: "^2" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges.map((e) => [
      e.from,
      e.section,
      e.name,
      e.resolution,
    ]),
  ).toEqual([
    ["", "optionalDependencies", "a", "locked"],
    ["yarn:a@^2", "optionalDependencies", "native", "missing"],
  ]);
});
it("leaves a versionless selector unsupported", async () => {
  const root = await fixture('a@^1:\n  integrity "fixture"\n', {
    dependencies: { a: "^1" },
  });
  expect(
    (await scanProject(root, target)).dependencyGraph.edges[0]?.resolution,
  ).toBe("unsupported");
});
it("does not infer peer context from absent Classic metadata", async () => {
  const report = await scanProject(await fixture(""), target);
  expect(report.coverage.limitations.map((l) => l.code)).toContain(
    "yarn-peer-graph-not-recorded",
  );
});
it("classifies future Berry YAML separately without parsing it as Classic", async () => {
  const report = await scanProject(
    await fixture("__metadata:\n  version: 99\n", {}, ""),
    target,
  );
  expect({
    nodes: report.dependencyGraph.nodes,
    coverage: report.coverage.dependencyGraph,
    codes: report.coverage.limitations.map((l) => l.code),
  }).toMatchObject({
    nodes: [],
    coverage: "declarations-only",
    codes: expect.arrayContaining(["unsupported-yarn-berry-lockfile-version"]),
  });
});
it("marks future Classic format versions unsupported", async () => {
  const report = await scanProject(
    await fixture("", {}, "# yarn lockfile v2\n"),
    target,
  );
  expect(report.coverage.limitations.map((l) => l.code)).toContain(
    "unsupported-yarn-lockfile-version",
  );
});
it("marks an unrecognized headerless format unknown", async () => {
  const report = await scanProject(
    await fixture('a@^1:\n  version "1.0.0"\n', {}, ""),
    target,
  );
  expect(report.coverage.limitations.map((l) => l.code)).toContain(
    "unrecognized-yarn-lockfile-format",
  );
});
it.each([
  'a@^1:\n  version "unterminated\n',
  "a@^1:\n  version 42\n",
  'a@^1:\n  version "1.0.0"\n  dependencies "invalid"\n',
  'a@^1:\n  version "1.0.0"\na@^1:\n  version "2.0.0"\n',
  '<<<<<<< HEAD\na@^1:\n  version "1.0.0"\n=======\na@^1:\n  version "2.0.0"\n>>>>>>> other\n',
])(
  "rejects invalid/ambiguous Classic data without exposing raw parser text: %s",
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
      { encoding: "utf8", timeout: 3000 },
    );
    expect({
      code: result.status,
      stdout: result.stdout,
      diagnostic: result.stderr.includes("yarn.lock"),
    }).toEqual({ code: 1, stdout: "", diagnostic: true });
  },
);
it("does not serialize URL selectors, resolved credentials or raw parser excerpts", async () => {
  const root = await fixture(
    '"remote@https://example.invalid/pkg?token=fixture-secret":\n  version "1.0.0"\n  resolved "https://example.invalid/pkg?token=fixture-secret"\n',
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
it("fails on symlinked selected Classic files", async () => {
  const root = await fixture("");
  await rm(join(root, "yarn.lock"));
  await symlink(join(root, "package.json"), join(root, "yarn.lock"));
  await expect(scanProject(root, target)).rejects.toThrow(/yarn.lock/);
});
it("requires manager selection across npm/pnpm/yarn families", async () => {
  const root = await fixture("");
  await writeFile(
    join(root, "pnpm-lock.yaml"),
    'lockfileVersion: "9.0"\nimporters: {.: {}}',
  );
  await expect(scanProject(root, target)).rejects.toThrow(
    /Multiple.*lockfiles/,
  );
});
it("selects yarn explicitly without parsing ignored invalid npm/pnpm locks", async () => {
  const root = await fixture("", { packageManager: "yarn@1.22.22" });
  await writeFile(join(root, "pnpm-lock.yaml"), "invalid: [");
  await writeFile(join(root, "package-lock.json"), "{");
  expect((await scanProject(root, target)).dependencyGraph.source).toBe(
    "yarn.lock",
  );
});
it("selects npm explicitly without parsing ignored invalid yarn data", async () => {
  const root = await fixture('"invalid', { packageManager: "npm@10.9.9" });
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify({ lockfileVersion: 3, packages: { "": {} } }),
  );
  expect((await scanProject(root, target)).dependencyGraph.source).toBe(
    "package-lock.json",
  );
});
it("preserves BOM/CRLF and deterministic schema-valid CLI/core output", async () => {
  const root = await fixture(
    'a@^1:\r\n  version "1.0.0"\r\n  dependencies:\r\n    a "^1"\r\n',
    { dependencies: { a: "^1" } },
    "\uFEFF# yarn lockfile v1\r\n",
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
  }).toEqual({ cli: report, repeat: report, valid: true, edges: 2 });
});

it("bounds expanded selector cardinality before producing a partial graph", async () => {
  const data = Array.from(
    { length: 10001 },
    (_, i) => `pkg${i}@^1:\n  version "1.0.0"\n`,
  ).join("");
  await expect(scanProject(await fixture(data), target)).rejects.toThrow(
    /selector count limit/,
  );
});
it("bounds long selector lines before invoking the Classic parser", async () => {
  await expect(
    scanProject(
      await fixture("a".repeat(16385) + ':\n  version "1.0.0"\n'),
      target,
    ),
  ).rejects.toThrow(/line length limit/);
});
it("keeps raw tokens out of CLI parser diagnostics", async () => {
  const root = await fixture(
    'a@^1:\n  version "https://example.invalid/?token=fixture-secret\n',
  );
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
    { encoding: "utf8", timeout: 3000 },
  );
  expect({
    code: result.status,
    stdout: result.stdout,
    leak: result.stderr.includes("fixture-secret"),
    quoted: result.stderr.includes("unterminated quoted string"),
  }).toEqual({ code: 1, stdout: "", leak: false, quoted: true });
});

it("scans the documented Classic fixture without hiding missing optional or unsupported peer edges", async () => {
  const report = await scanProject("fixtures/developer/yarn-graph", target);
  expect({
    nodes: report.dependencyGraph.nodes.length,
    edges: report.dependencyGraph.edges.length,
    missing: report.dependencyGraph.edges
      .filter((e) => e.resolution === "missing")
      .map((e) => e.name),
    unsupported: report.dependencyGraph.edges
      .filter((e) => e.resolution === "unsupported")
      .map((e) => e.name),
  }).toEqual({
    nodes: 4,
    edges: 6,
    missing: ["native-addon"],
    unsupported: ["peer"],
  });
});

it.each([
  'a@^1:\n  version "unterminated\n',
  'a@^1:\n  version "trailing-escape\\\n',
])(
  "rejects an unterminated quoted token before legacy parsing",
  async (text) => {
    await expect(scanProject(await fixture(text), target)).rejects.toThrow(
      /unterminated quoted string/,
    );
  },
);
it("allows comment quotes and escaped quoted scalar content", async () => {
  const root = await fixture(
    String.raw`# unclosed " comment
"a@^1":
  version "1.0.0" # unclosed trailing " comment
  note "escaped \"quote\" and \\slash"
`,
    { dependencies: { a: "^1" } },
  );
  expect(
    (await scanProject(root, target)).dependencyGraph.edges[0]?.resolution,
  ).toBe("locked");
});

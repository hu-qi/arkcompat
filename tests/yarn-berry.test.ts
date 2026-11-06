import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
};
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => rm(r, { recursive: true, force: true })),
  );
});
async function fixture(
  body: string,
  manifest: unknown = {},
  header = "__metadata:\n  version: 8\n  cacheKey: 10c0\n",
) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-berry-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(join(root, "yarn.lock"), header + body);
  return root;
}
const grouped =
  '"a@npm:^1":\n  version: 1.0.0\n  resolution: "a@npm:1.0.0"\n  dependencies:\n    shared: "npm:~1"\n  linkType: hard\n"shared@npm:^1, shared@npm:~1":\n  version: 1.2.0\n  resolution: "shared@npm:1.2.0"\n  linkType: hard\n';
it("records Berry v8 grouped registry descriptors and exact direct/transitive edges", async () => {
  const report = await scanProject(
    await fixture(grouped, { dependencies: { a: "^1", shared: "^1" } }),
    target,
  );
  expect({
    version: report.schemaVersion,
    coverage: report.coverage.dependencyGraph,
    nodes: report.dependencyGraph.nodes.map((n) => n.id),
    edges: report.dependencyGraph.edges.map((e) => [
      e.from,
      e.to,
      e.resolution,
    ]),
  }).toEqual({
    version: "0.6.0",
    coverage: "yarn-berry-lockfile-partial",
    nodes: [
      "yarn-berry:a@npm:^1",
      "yarn-berry:shared@npm:^1",
      "yarn-berry:shared@npm:~1",
    ],
    edges: [
      ["", "yarn-berry:a@npm:^1", "locked"],
      ["", "yarn-berry:shared@npm:^1", "locked"],
      ["yarn-berry:a@npm:^1", "yarn-berry:shared@npm:~1", "locked"],
    ],
  });
});
it("preserves scoped npm alias install identity and registry locator identity", async () => {
  const report = await scanProject(
    await fixture(
      '"alias@npm:@scope/real@^2":\n  version: 2.1.0\n  resolution: "@scope/real@npm:2.1.0"\n  linkType: hard\n',
      { dependencies: { alias: "npm:@scope/real@^2" } },
    ),
    target,
  );
  expect(report.dependencyGraph.nodes).toEqual([
    {
      id: "yarn-berry:alias@npm:@scope/real@^2",
      installName: "alias",
      name: "@scope/real",
      version: "2.1.0",
      link: false,
    },
  ]);
});
it("does not select another range by same package name/version", async () => {
  const report = await scanProject(
    await fixture(grouped, { dependencies: { shared: "^9" } }),
    target,
  );
  expect(report.dependencyGraph.edges[0]).toMatchObject({
    resolution: "missing",
    to: null,
  });
});
it("retains optional metadata, missing edges and unresolved peer context", async () => {
  const report = await scanProject(
    await fixture(
      '"a@npm:^1":\n  version: 1.0.0\n  resolution: "a@npm:1.0.0"\n  dependencies:\n    native: "npm:^1"\n  dependenciesMeta:\n    native:\n      optional: true\n  peerDependencies:\n    host: "^1"\n  conditions: os=linux\n  linkType: hard\n',
      {
        dependencies: { a: "^2" },
        optionalDependencies: { a: "^1" },
        peerDependencies: { host: "^1" },
      },
    ),
    target,
  );
  expect(
    report.dependencyGraph.edges.map((e) => [e.name, e.section, e.resolution]),
  ).toEqual([
    ["a", "optionalDependencies", "locked"],
    ["host", "peerDependencies", "unsupported"],
    ["native", "optionalDependencies", "missing"],
    ["host", "peerDependencies", "unsupported"],
  ]);
  expect(report.coverage.limitations.map((l) => l.code)).toContain(
    "yarn-berry-conditions-not-evaluated",
  );
});
it("does not follow workspace/patch/URL locators or leak their selectors", async () => {
  const report = await scanProject(
    await fixture(
      '"local@workspace:.":\n  version: 0.0.0-use.local\n  resolution: "local@workspace:."\n  linkType: soft\n"remote@https://example.invalid/archive?token=PRIVATE_TOKEN":\n  version: 1.0.0\n  resolution: "remote@https://example.invalid/archive?token=PRIVATE_TOKEN"\n  linkType: hard\n"patched@patch:private#PRIVATE_PATCH":\n  version: 1.0.0\n  resolution: "patched@patch:private#PRIVATE_PATCH"\n  linkType: hard\n',
      {
        dependencies: {
          local: "workspace:*",
          remote: "https://example.invalid/archive?token=PRIVATE_TOKEN",
          patched: "patch:private#PRIVATE_PATCH",
        },
      },
    ),
    target,
  );
  expect({
    nodes: report.dependencyGraph.nodes,
    unsupported: report.dependencyGraph.edges.every(
      (e) => e.resolution === "unsupported",
    ),
    leak: JSON.stringify(report).includes("PRIVATE_TOKEN"),
    patchLeak: JSON.stringify(report).includes("PRIVATE_PATCH"),
  }).toEqual({ nodes: [], unsupported: true, leak: false, patchLeak: false });
});
it.each([
  '"a@npm:^1": [',
  '"a@npm:^1": {}\n"a@npm:^1": {}\n',
  '"a@npm:^1":\n  version: 1.0.0\n  resolution: "a@npm:1.0.0"\n  linkType: hard\n"a@npm:^1, a@npm:~1":\n  version: 1.0.0\n  resolution: "a@npm:1.0.0"\n  linkType: hard\n',
  '"a@npm:^1":\n  version: 1.0.0\n  resolution: "b@npm:1.0.0"\n  linkType: hard\n',
  '"a@npm:^1":\n  version: 2.0.0\n  resolution: "a@npm:1.0.0"\n  linkType: hard\n',
  '"a@npm:^1":\n  version: 1.0.0\n  resolution: "a@npm:1.0.0"\n  dependencies: { b: 42 }\n  linkType: hard\n',
  '"a@npm:^1":\n  version: 1.0.0\n  resolution: "a@npm:1.0.0"\n  dependenciesMeta: { b: { optional: PRIVATE_TOKEN } }\n  linkType: hard\n',
  "a: &alias { version: 1.0.0 }\nb: *alias\n",
  "a: !unsafe PRIVATE_TOKEN\n",
  "<<<<<<< HEAD\nPRIVATE_TOKEN\n=======\n>>>>>>> branch\n",
])(
  "fails recognized malformed/ambiguous Berry data with sanitized CLI stderr",
  async (body) => {
    const root = await fixture(body);
    await expect(scanProject(root, target)).rejects.toThrow(/yarn.lock/);
    const cli = spawnSync(
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
      code: cli.status,
      stdout: cli.stdout,
      leak: cli.stderr.includes("PRIVATE_TOKEN"),
    }).toEqual({ code: 1, stdout: "", leak: false });
  },
);
it("reports unsupported Berry versions without claiming transitive coverage", async () => {
  const r = await scanProject(
    await fixture("", {}, "__metadata:\n  version: 99\n"),
    target,
  );
  expect({
    coverage: r.coverage.dependencyGraph,
    codes: r.coverage.limitations.map((l) => l.code),
  }).toMatchObject({
    coverage: "declarations-only",
    codes: expect.arrayContaining(["unsupported-yarn-berry-lockfile-version"]),
  });
});
it("requires valid metadata and does not confuse mixed Classic/Berry headers", async () => {
  for (const header of [
    "__metadata: {}\n",
    "__metadata: {version: bad}\n",
    "# yarn lockfile v1\n__metadata:\n  version: 8\n",
  ])
    await expect(
      scanProject(await fixture("", {}, header), target),
    ).rejects.toThrow(/yarn.lock/);
});
it("preserves unknown/versionless/unsupported-protocol graph limitations", async () => {
  const r = await scanProject(
    await fixture(
      '"a@npm:^1":\n  resolution: "a@npm:1.0.0"\n  linkType: hard\n"b@virtual:private#npm:1.0.0":\n  version: 1.0.0\n  resolution: "b@virtual:private#npm:1.0.0"\n  linkType: hard\n',
      { dependencies: { a: "^1" } },
    ),
    target,
  );
  expect({
    resolution: r.dependencyGraph.edges[0]!.resolution,
    version: r.dependencyGraph.nodes[0]!.version,
  }).toEqual({ resolution: "unsupported", version: null });
});
it("bounds selector/edge processing before returning a partial success", async () => {
  const data = Array.from(
    { length: 10001 },
    (_, i) =>
      `"p${i}@npm:^1":\n  version: 1.0.0\n  resolution: "p${i}@npm:1.0.0"\n  linkType: hard\n`,
  ).join("");
  await expect(scanProject(await fixture(data), target)).rejects.toThrow(
    /limit/,
  );
});
it("keeps schema-valid deterministic CLI/core output with BOM and CRLF", async () => {
  const root = await fixture(
    grouped.replaceAll("\n", "\r\n"),
    { dependencies: { a: "^1" } },
    "\uFEFF__metadata:\r\n  version: 8\r\n",
  );
  const r = await scanProject(root, target);
  const cli = JSON.parse(
    execFileSync(
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
    ),
  );
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  expect({
    cli,
    repeat: await scanProject(root, target),
    valid: new Ajv().compile(schema)(r),
    unknown: r.findings.every((f) => f.status === "unknown"),
  }).toEqual({ cli: r, repeat: r, valid: true, unknown: true });
});

it("distinguishes a recorded unsupported locator from a missing descriptor", async () => {
  const r = await scanProject(
    await fixture(
      '"a@npm:^1":\n  version: 1.0.0\n  resolution: "a@patch:PRIVATE_PATCH"\n  linkType: hard\n',
      { dependencies: { a: "^1" } },
    ),
    target,
  );
  expect({
    resolution: r.dependencyGraph.edges[0]!.resolution,
    leak: JSON.stringify(r).includes("PRIVATE_PATCH"),
  }).toEqual({ resolution: "unsupported", leak: false });
});

it("scans the documented Berry fixture with the complete missing/unsupported denominator", async () => {
  const r = await scanProject("fixtures/developer/yarn-berry-graph", target);
  expect({
    nodes: r.dependencyGraph.nodes.length,
    edges: r.dependencyGraph.edges.length,
    missing: r.dependencyGraph.edges
      .filter((e) => e.resolution === "missing")
      .map((e) => e.name),
    unsupported: r.dependencyGraph.edges
      .filter((e) => e.resolution === "unsupported")
      .map((e) => e.name),
  }).toEqual({
    nodes: 4,
    edges: 6,
    missing: ["native"],
    unsupported: ["host"],
  });
});

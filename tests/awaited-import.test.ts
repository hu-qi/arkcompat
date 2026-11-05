import { execFileSync } from "node:child_process";
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
async function fixture(text: string) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-await-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), "{}");
  await writeFile(join(root, "main.ts"), text);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("records const awaited namespaces with literal specifiers and source positions", async () => {
  const root = await fixture(
    'const fs = await import("node:fs/promises");\nfs.readFile("omitted");',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    dynamicLimits: report.coverage.limitations.filter(
      (l) => l.code === "dynamic-import-bindings-not-analyzed",
    ),
  }).toEqual({
    usages: [
      {
        module: "node:fs/promises",
        path: ["*", "readFile"],
        kind: "call",
        optional: false,
        location: { path: "main.ts", line: 2, column: 1 },
      },
    ],
    dynamicLimits: [],
  });
});
it("records awaited named/default destructures, optional calls and constructors", async () => {
  const root = await fixture(
    'const { readFile: read } = await import("node:fs/promises");\nconst { default: Client } = await import(`client`);\nread?.(); new Client();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.module,
      u.path,
      u.kind,
      u.optional,
    ]),
  ).toEqual([
    ["node:fs/promises", ["readFile"], "call", true],
    ["client", ["default"], "construct", false],
  ]);
});
it("resolves direct awaited static members through TypeScript wrappers", async () => {
  const root = await fixture(
    'export {};\n(await (import("node:fs/promises") as Promise<unknown>))["readFile"]();\n(await import("client"))?.default?.send?.();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.module,
      u.path,
      u.optional,
    ]),
  ).toEqual([
    ["node:fs/promises", ["*", "readFile"], false],
    ["client", ["*", "default", "send"], true],
  ]);
});
it("keeps mutable awaited bindings and non-awaited promises unattributed", async () => {
  const root = await fixture(
    'let mutable = await import("a"); mutable = other; mutable.run();\nconst promise = import("b"); promise.run();\nimport("c").then((m) => m.run());',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    codes: report.coverage.limitations.map((l) => l.code),
  }).toMatchObject({
    usages: [],
    codes: expect.arrayContaining([
      "mutable-module-binding-not-analyzed",
      "dynamic-import-bindings-not-analyzed",
    ]),
  });
});
it("does not resolve dynamic module expressions or leak their source text", async () => {
  const root = await fixture(
    "const m = await import(privateVariable); m.run();\nconst n = await import(`private-${privateVariable}`); n.run();",
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    specifiers: report.references.map((r) => r.specifier),
    leak: JSON.stringify(report).includes("privateVariable"),
  }).toEqual({ usages: [], specifiers: [null, null], leak: false });
});
it("does not treat an ordinary script function named await as the await operator", async () => {
  const root = await fixture(
    'function await(value: unknown) { return value; }\n(await(import("api"))).run();',
  );
  expect((await scanProject(root, target)).apiUsages).toEqual([]);
});
it("excludes lexical shadows and unsupported awaited destructuring defaults/rest/nesting", async () => {
  const root = await fixture(
    'const m = await import("api");\nfunction local(m: { run(): void }) { m.run(); }\nconst { run = fallback, ...rest } = await import("api");\nconst { nested: { send } } = await import("api");\nrun(); rest.run(); send(); m.run();',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages.map((u) => [u.path, u.location.line]),
    unsupported: report.coverage.limitations.some(
      (l) => l.code === "unsupported-module-binding",
    ),
  }).toEqual({ usages: [[["*", "run"], 5]], unsupported: true });
});
it("redacts awaited module URLs and omits arguments from findings", async () => {
  const root = await fixture(
    'const m = await import("https://example.invalid/?token=fixture-secret");\nm.run("private-payload");',
  );
  const report = await scanProject(root, target);
  expect({
    module: report.apiUsages[0]?.module,
    leak: /fixture-secret|private-payload|example.invalid/.test(
      JSON.stringify(report),
    ),
    statuses: [...new Set(report.findings.map((f) => f.status))],
  }).toEqual({ module: "[redacted-url]", leak: false, statuses: ["unknown"] });
});
it("preserves deterministic schema-valid CLI/source parity for awaited imports", async () => {
  const root = await fixture(
    'const { readFile } = await import("node:fs/promises"); readFile();',
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
it("inventories the authored awaited-import fixture while retaining its unresolved import", async () => {
  const report = await scanProject("fixtures/developer/awaited-import", target);
  expect({
    references: report.references.map((r) => [r.kind, r.specifier]),
    usages: report.apiUsages.map((u) => [u.module, u.path, u.kind]),
    dynamic: report.coverage.limitations.filter(
      (l) => l.code === "dynamic-import-bindings-not-analyzed",
    ),
    statuses: [...new Set(report.findings.map((f) => f.status))],
  }).toEqual({
    references: [
      ["dynamic-import", "node:fs/promises"],
      ["dynamic-import", "example-client"],
      ["dynamic-import", null],
    ],
    usages: [
      ["node:fs/promises", ["*", "readFile"], "call"],
      ["example-client", ["default"], "construct"],
    ],
    dynamic: [
      { code: "dynamic-import-bindings-not-analyzed", path: "src/imports.ts" },
    ],
    statuses: ["unknown"],
  });
});

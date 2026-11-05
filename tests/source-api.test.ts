import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { Ajv } from "ajv";
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";
const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
};
const roots: string[] = [];
async function fixture(text: string, name = "main.ts") {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-api-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), "{}");
  await writeFile(join(root, name), text);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("records named/default/namespace API calls with imported names and source positions", async () => {
  const root = await fixture(
    'import client from "client";\nimport * as fs from "node:fs";\nimport { readFile as read } from "node:fs/promises";\nclient.get("/private");\nfs.promises.readFile("/private");\nread("/private");',
  );
  const report = await scanProject(root, target);
  expect(
    report.apiUsages.map((u) => [
      u.module,
      u.path,
      u.kind,
      u.location.line,
      u.location.column,
    ]),
  ).toEqual([
    ["client", ["default", "get"], "call", 4, 1],
    ["node:fs", ["*", "promises", "readFile"], "call", 5, 1],
    ["node:fs/promises", ["readFile"], "call", 6, 1],
  ]);
});
it("uses lexical symbols so shadowed import names do not become module calls", async () => {
  const root = await fixture(
    'import { readFile as read } from "node:fs";\nfunction local(read: () => void) { read(); }\n{ const read = () => {}; read(); }\nread("x", () => {});',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => u.location.line),
  ).toEqual([4]);
});
it("excludes unrelated identifiers and type-only imports from API calls", async () => {
  const root = await fixture(
    'import type { Client } from "client";\nimport { type Other } from "client";\nconst fs = { readFile() {} }; fs.readFile();\nClient(); Other();',
  );
  expect((await scanProject(root, target)).apiUsages).toEqual([]);
});
it("records constructors and optional calls as potential source sites", async () => {
  const root = await fixture(
    'import { Client } from "client";\nimport * as fs from "node:fs";\nnew Client();\nfs?.readFile?.("x");',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.path,
      u.kind,
      u.optional,
    ]),
  ).toEqual([
    [["Client"], "construct", false],
    [["*", "readFile"], "call", true],
  ]);
});
it("extracts immutable CommonJS namespace/destructured bindings and direct require calls", async () => {
  const root = await fixture(
    'const fs = require("node:fs");\nconst { readFile: read } = require("node:fs/promises");\nfs.readFileSync("x");\nread("x");\nrequire("node:path").join("a", "b");',
    "main.cjs",
  );
  const report = await scanProject(root, target);
  expect({
    references: report.references.map((r) => [r.kind, r.specifier]),
    usages: report.apiUsages.map((u) => [u.module, u.path]),
  }).toEqual({
    references: [
      ["require", "node:fs"],
      ["require", "node:fs/promises"],
      ["require", "node:path"],
    ],
    usages: [
      ["node:fs", ["*", "readFileSync"]],
      ["node:fs/promises", ["readFile"]],
      ["node:path", ["*", "join"]],
    ],
  });
});
it("does not treat shadowed require or object.require as module loaders", async () => {
  const root = await fixture(
    'function local(require: (x: string) => any) { const fs = require("fake"); fs.readFile(); }\nconst object = { require(x: string) { return {}; } }; object.require("fake");',
  );
  const report = await scanProject(root, target);
  expect({ references: report.references, usages: report.apiUsages }).toEqual({
    references: [],
    usages: [],
  });
});
it("records dynamic require as unresolved without serializing its argument", async () => {
  const root = await fixture("require(privateVariable);");
  expect(
    (await scanProject(root, target)).references.map((r) => [
      r.kind,
      r.specifier,
    ]),
  ).toEqual([["require", null]]);
});
it("keeps mutable require bindings out of imported API attribution", async () => {
  const root = await fixture(
    'let fs = require("node:fs"); fs = custom; fs.readFile();',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    codes: report.coverage.limitations.map((l) => l.code),
  }).toMatchObject({
    usages: [],
    codes: expect.arrayContaining(["mutable-module-binding-not-analyzed"]),
  });
});
it("does not attribute destructuring defaults/rest/nested patterns to original module APIs", async () => {
  const root = await fixture(
    'const { readFile = fallback, ...rest } = require("node:fs");\nconst { promises: { open } } = require("node:fs");\nreadFile(); rest.readFile(); open();',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    codes: report.coverage.limitations.map((l) => l.code),
  }).toMatchObject({
    usages: [],
    codes: expect.arrayContaining(["unsupported-module-binding"]),
  });
});
it("extracts TS import-equals and import type references", async () => {
  const root = await fixture(
    'import fs = require("node:fs");\ntype Client = import("client").Client;\nfs.readFileSync("x");',
  );
  const report = await scanProject(root, target);
  expect({
    references: report.references.map((r) => [r.kind, r.specifier]),
    usages: report.apiUsages.map((u) => u.path),
  }).toEqual({
    references: [
      ["import-equals", "node:fs"],
      ["import-type", "client"],
    ],
    usages: [["*", "readFileSync"]],
  });
});
it("leaves computed member calls and reassigned aliases explicit instead of guessing", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nfs[privateKey]("x");\nconst read = fs.readFile; read("x");',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    codes: report.coverage.limitations.map((l) => l.code),
  }).toMatchObject({
    usages: [],
    codes: expect.arrayContaining([
      "computed-module-member-not-analyzed",
      "module-alias-dataflow-not-analyzed",
    ]),
  });
});
it("records a direct imported API call but does not guess the returned object API", async () => {
  const root = await fixture(
    'import * as fs from "node:fs/promises";\nfs.open("x").then(callback);',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => u.path),
  ).toEqual([["*", "open"]]);
});
it("keeps call arguments and credential-bearing module URLs out of reports", async () => {
  const root = await fixture(
    'import client from "https://example.invalid/pkg?token=fixture-secret";\nclient.send("private-payload");',
  );
  const report = await scanProject(root, target);
  expect({
    module: report.apiUsages[0]?.module,
    leak: /fixture-secret|private-payload|example.invalid/.test(
      JSON.stringify(report),
    ),
  }).toEqual({ module: "[redacted-url]", leak: false });
});
it("emits unknown API findings with the target and evidence rather than compatibility claims", async () => {
  const root = await fixture(
    'import { readFile } from "node:fs";\nreadFile("x");',
  );
  const finding = (await scanProject(root, target)).findings.find(
    (f) => f.ruleId === "inventory.api-usage",
  );
  expect(finding).toMatchObject({
    status: "unknown",
    tier: "rule-static",
    target,
    location: { path: "main.ts", line: 2, column: 1 },
  });
});
it("preserves schema validity and deterministic CLI/core API inventory", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nfs.readFileSync("x");',
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

it("scans the documented source fixture without counting the shadowed local callback", async () => {
  const report = await scanProject("fixtures/developer/source-api", target);
  expect({
    references: report.references.length,
    usages: report.apiUsages.length,
    modules: report.apiUsages.map((u) => u.module),
  }).toEqual({
    references: 6,
    usages: 4,
    modules: ["node:fs", "node:fs/promises", "example-client", "node:path"],
  });
});

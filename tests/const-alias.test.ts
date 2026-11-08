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
async function fixture(text: string, name = "main.ts") {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-alias-"));
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
it("resolves chained const aliases of named and namespace member imports", async () => {
  const root = await fixture(
    'import { readFile as original } from "node:fs";\nimport * as fs from "node:fs/promises";\nconst read = original; const copy = read;\nconst readAsync = fs["readFile"];\ncopy(); readAsync();',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages.map((u) => [u.module, u.path]),
    aliasLimits: report.coverage.limitations.filter(
      (l) => l.code === "module-alias-dataflow-not-analyzed",
    ),
  }).toEqual({
    usages: [
      ["node:fs", ["readFile"]],
      ["node:fs/promises", ["*", "readFile"]],
    ],
    aliasLimits: [],
  });
});
it("retains default, CommonJS and awaited namespace identity through aliases", async () => {
  const root = await fixture(
    'import client from "client";\nconst copy = client; copy.send();\nconst fs = require("node:fs"); const read = fs.readFile; read();\nconst m = await import("api"); const run = m.run; run();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [u.module, u.path]),
  ).toEqual([
    ["client", ["default", "send"]],
    ["node:fs", ["*", "readFile"]],
    ["api", ["*", "run"]],
  ]);
});
it("records optional calls and constructors at the alias call site", async () => {
  const root = await fixture(
    'import { Client } from "client";\nconst Constructor = (Client!);\nnew Constructor();\nConstructor?.();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.path,
      u.kind,
      u.optional,
      u.location.line,
    ]),
  ).toEqual([
    [["Client"], "construct", false, 3],
    [["Client"], "call", true, 4],
  ]);
});
it("resolves forward-declared const aliases used in functions without traversal-order guessing", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nfunction use() { copy(); }\nconst copy = read; const read = fs.readFile;',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.path,
      u.location.line,
    ]),
  ).toEqual([[["*", "readFile"], 2]]);
});
it("excludes mutable aliases, shadows and const aliases of unrelated values", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nlet mutable = fs.readFile; mutable = other; mutable();\nconst read = fs.readFile;\nfunction local(read: () => void) { const copy = read; copy(); }\nconst unrelated = () => {}; const copy = unrelated; copy();\nread();',
  );
  const report = await scanProject(root, target);
  expect({
    lines: report.apiUsages.map((u) => u.location.line),
    aliasLimit: report.coverage.limitations.some(
      (l) => l.code === "module-alias-dataflow-not-analyzed",
    ),
  }).toEqual({ lines: [6], aliasLimit: true });
});
it("traces namespace destructures but excludes methods on returned values", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nconst { readFile } = fs; readFile();\nconst returned = fs.open(); returned.close();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => u.path),
  ).toEqual([
    ["*", "readFile"],
    ["*", "open"],
  ]);
});
it("preserves nested member paths, lexical scope and usage locations through simple destructures", async () => {
  const root = await fixture(
    [
      'import client from "client";',
      "const alias = client;",
      'const { "send": send, Client } = alias.transport;',
      "function shadow(send: () => void) { send(); }",
      "new Client();",
      "send?.();",
    ].join("\n"),
  );
  const report = await scanProject(root, target);
  expect(
    report.apiUsages.map((u) => [u.path, u.kind, u.optional, u.location.line]),
  ).toEqual([
    [["default", "transport", "Client"], "construct", false, 5],
    [["default", "transport", "send"], "call", true, 6],
  ]);
  expect(
    report.coverage.limitations.some(
      (l) => l.code === "module-alias-dataflow-not-analyzed",
    ),
  ).toBe(false);
});
it("withholds destructuring defaults, rest, nesting, computed keys and mutable bindings", async () => {
  const root = await fixture(
    [
      'import * as api from "api";',
      "const { good, fallback = own, nested: { member }, [dynamic]: computed, ...rest } = api;",
      "let { mutable } = api;",
      "good(); fallback(); member(); computed(); rest.call(); mutable();",
    ].join("\n"),
  );
  const report = await scanProject(root, target);
  expect(report.apiUsages.map((u) => u.path)).toEqual([["*", "good"]]);
  expect(
    report.coverage.limitations.some(
      (l) => l.code === "module-alias-dataflow-not-analyzed",
    ),
  ).toBe(true);
});
it("bounds destructured aliases that participate in cycles", async () => {
  const root = await fixture(
    "const { read } = copy; const copy = read; read();",
  );
  const report = await scanProject(root, target);
  expect(report.apiUsages).toEqual([]);
  expect(report.coverage.limitations).toContainEqual({
    code: "module-alias-cycle-not-analyzed",
    path: "main.ts",
  });
});
it("reports cyclic aliases without recursing indefinitely", async () => {
  const root = await fixture("const a = b; const b = a; a(); b();");
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    cycle: report.coverage.limitations.filter(
      (l) => l.code === "module-alias-cycle-not-analyzed",
    ),
  }).toEqual({
    usages: [],
    cycle: [{ code: "module-alias-cycle-not-analyzed", path: "main.ts" }],
  });
});
it("bounds alias chains and reports excessive depth without serializing names", async () => {
  const chain = Array.from(
    { length: 34 },
    (_, i) => `const a${i} = ${i === 33 ? "fs.readFile" : `a${i + 1}`};`,
  ).join("\n");
  const root = await fixture(
    `import * as fs from "node:fs";\n${chain}\na0(); a1(); a2(); a33();`,
  );
  const report = await scanProject(root, target);
  expect({
    paths: report.apiUsages.map((u) => u.path),
    depth: report.coverage.limitations.filter(
      (l) => l.code === "module-alias-depth-limit",
    ),
  }).toEqual({
    paths: [
      ["*", "readFile"],
      ["*", "readFile"],
    ],
    depth: [{ code: "module-alias-depth-limit", path: "main.ts" }],
  });
});
it("traces CommonJS aliases in a JavaScript source file", async () => {
  const root = await fixture(
    'const fs = require("node:fs"); const read = fs.readFile; read();',
    "main.cjs",
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [u.module, u.path]),
  ).toEqual([["node:fs", ["*", "readFile"]]]);
});
it("inventories the authored alias fixture without attributing shadows or mutable copies", async () => {
  const report = await scanProject("fixtures/developer/const-alias", target);
  expect({
    references: report.references.length,
    usages: report.apiUsages.map((u) => [u.module, u.path, u.location.line]),
    unsupported: report.coverage.limitations.filter(
      (l) => l.code === "module-alias-dataflow-not-analyzed",
    ),
    statuses: [...new Set(report.findings.map((f) => f.status))],
  }).toEqual({
    references: 1,
    usages: [["node:fs", ["readFile"], 6]],
    unsupported: [
      { code: "module-alias-dataflow-not-analyzed", path: "src/imports.ts" },
    ],
    statuses: ["unknown"],
  });
});
it("preserves redaction, unknown findings and schema-valid CLI/source parity", async () => {
  const root = await fixture(
    'import client from "https://example.invalid/?token=fixture-secret";\nconst send = client.send; send("private-payload");',
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
    repeated: await scanProject(root, target),
    valid: new Ajv().compile(schema)(report),
    module: report.apiUsages[0]?.module,
    leak: /fixture-secret|private-payload|example.invalid/.test(
      JSON.stringify(report),
    ),
    statuses: [...new Set(report.findings.map((f) => f.status))],
  }).toEqual({
    cli: report,
    repeated: report,
    valid: true,
    module: "[redacted-url]",
    leak: false,
    statuses: ["unknown"],
  });
});

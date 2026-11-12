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
    'import * as fs from "node:fs";\nfs[privateKey]("x");\nlet read = fs.readFile; read = custom; read("x");',
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
it("normalizes literal bracket members into the same path as static dot members", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nfs["promises"][`readFile`]("private-payload");\nfs.promises.readFile("private-payload");',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.module,
      u.path,
      u.location.line,
      u.location.column,
    ]),
  ).toEqual([
    ["node:fs", ["*", "promises", "readFile"], 2, 1],
    ["node:fs", ["*", "promises", "readFile"], 3, 1],
  ]);
});
it("records bracket constructors and optional calls through wrapped imported bindings", async () => {
  const root = await fixture(
    'import client from "client";\nimport * as api from "api";\n(client!)["send"]?.();\napi?.["service"]?.[`run`]?.();\nnew api["Client"]();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [
      u.path,
      u.kind,
      u.optional,
    ]),
  ).toEqual([
    [["default", "send"], "call", true],
    [["*", "service", "run"], "call", true],
    [["*", "Client"], "construct", false],
  ]);
});
it("does not evaluate identifiers, interpolation, numeric keys or expressions as member names", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nconst key = "readFile";\nfs[key](); fs[`read${key}`](); fs[1](); fs["read" + "File"]();',
  );
  const report = await scanProject(root, target);
  expect({
    usages: report.apiUsages,
    limitations: report.coverage.limitations.filter(
      (l) => l.code === "computed-module-member-not-analyzed",
    ),
  }).toEqual({
    usages: [],
    limitations: [
      { code: "computed-module-member-not-analyzed", path: "main.ts" },
    ],
  });
});
it("does not inventory literal bracket calls on shadowed or unrelated objects", async () => {
  const root = await fixture(
    'import * as fs from "node:fs";\nfunction local(fs: { readFile(): void }) { fs["readFile"](); }\nconst other = { readFile() {} }; other["readFile"]();\nfs["readFile"]();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => u.location.line),
  ).toEqual([4]);
});
it("retains CommonJS and named-import identity through literal bracket members", async () => {
  const root = await fixture(
    'import { client as c } from "client";\nc["send"]();\nrequire("node:fs")["promises"]["readFile"]();',
  );
  expect(
    (await scanProject(root, target)).apiUsages.map((u) => [u.module, u.path]),
  ).toEqual([
    ["client", ["client", "send"]],
    ["node:fs", ["*", "promises", "readFile"]],
  ]);
});
it("sanitizes URL-like bracket keys and omits call arguments", async () => {
  const root = await fixture(
    'import * as client from "client";\nclient["https://example.invalid/?token=fixture-secret"]("private-payload");',
  );
  const report = await scanProject(root, target);
  expect({
    path: report.apiUsages[0]?.path,
    leak: /fixture-secret|private-payload|example.invalid/.test(
      JSON.stringify(report),
    ),
  }).toEqual({ path: ["*", "[redacted-url]"], leak: false });
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
    'import * as fs from "node:fs";\nfs["readFileSync"]("x");',
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

it("scans the static-member fixture with explicit dynamic-key and lexical-shadow limits", async () => {
  const report = await scanProject("fixtures/developer/static-members", target);
  expect({
    references: report.references.length,
    usages: report.apiUsages.map((u) => [u.module, u.path, u.optional]),
    computed: report.coverage.limitations.filter(
      (l) => l.code === "computed-module-member-not-analyzed",
    ),
    statuses: [...new Set(report.findings.map((f) => f.status))],
  }).toEqual({
    references: 2,
    usages: [
      ["node:fs", ["*", "promises", "readFile"], false],
      ["example-client", ["default", "send"], true],
    ],
    computed: [
      { code: "computed-module-member-not-analyzed", path: "src/imports.ts" },
    ],
    statuses: ["unknown"],
  });
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

it("inventories imported ETS calls while keeping ArkUI DSL outside API attribution", async () => {
  const report = await scanProject("fixtures/developer/ets-source", target);
  expect({
    references: report.references.map((reference) => [
      reference.kind,
      reference.specifier,
      reference.location.line,
    ]),
    usages: report.apiUsages.map((usage) => [
      usage.module,
      usage.path,
      usage.kind,
      usage.location.line,
      usage.location.column,
    ]),
    limitations: report.coverage.limitations.filter((limitation) =>
      limitation.code.startsWith("ets-"),
    ),
    sourceFiles: report.coverage.sourceFiles,
    statuses: [...new Set(report.findings.map((finding) => finding.status))],
  }).toEqual({
    references: [
      ["import", "@ohos/lottie", 1],
      ["import", "@kit.PerformanceAnalysisKit", 2],
      ["import", "example.graphics", 3],
      ["import", "example-client", 4],
    ],
    usages: [
      ["@ohos/lottie", ["default", "loadAnimation"], "call", 12, 19],
      ["@ohos/lottie", ["loadAnimation"], "call", 13, 5],
      ["@kit.PerformanceAnalysisKit", ["hilog", "info"], "call", 14, 5],
      ["example.graphics", ["*", "Canvas", "render"], "call", 15, 5],
      ["example-client", ["Widget"], "construct", 16, 19],
    ],
    limitations: [
      {
        code: "ets-arkui-dsl-not-analyzed",
        path: "Index.ets",
      },
      {
        code: "ets-source-syntax-partially-analyzed",
        path: "Index.ets",
      },
      {
        code: "ets-type-check-partially-analyzed",
        path: "Index.ets",
      },
    ],
    sourceFiles: 1,
    statuses: ["unknown"],
  });
  const raw = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      "fixtures/developer/ets-source",
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
    ],
    { encoding: "utf8" },
  );
  expect(JSON.parse(raw)).toEqual(report);
});

it("applies conservative ETS import fallback around lexical shadowing", async () => {
  const root = await fixture(
    [
      'import api, { run as namedRun } from "example-api"',
      'import * as ns from "example-namespace"',
      'import { localFn, LocalClass, LocalEnum, LocalNamespace } from "local-values"',
      "",
      "function localFn(): void {}",
      "class LocalClass {}",
      "enum LocalEnum { value }",
      "namespace LocalNamespace { export const value = 1 }",
      "",
      "@Entry",
      "@Component",
      "struct Index {",
      "  parameterShadow(api: Object, namedRun: Object): void {",
      "    api.run()",
      "    namedRun()",
      "  }",
      "",
      "  blockShadow(): void {",
      "    { const api = local; api.run() }",
      "  }",
      "",
      "  loopShadow(): void {",
      "    for (const namedRun of callbacks) namedRun()",
      "    for (let ns = 0; ns < 1; ns++) ns.run()",
      "    for (const ns in record) ns.run()",
      "  }",
      "",
      "  catchShadow(): void {",
      "    try { work() } catch (api) { api.run() }",
      "  }",
      "",
      "  varShadow(): void {",
      "    if (false) { var ns = local }",
      "    ns.run()",
      "  }",
      "",
      "  localDeclarationShadow(): void {",
      "    function localFn(): void {}",
      "    localFn()",
      "    class LocalClass {}",
      "    new LocalClass()",
      "  }",
      "",
      "  positive(): void {",
      "    api.run()",
      "    namedRun()",
      "    ns.run()",
      "  }",
      "",
      "  build(): void {",
      "    Column({ space: 12 }) {",
      "      Text('ArkCompat ETS fixture')",
      "    }.width('100%')",
      "  }",
      "}",
    ].join("\n"),
    "main.ets",
  );
  const report = await scanProject(root, target);
  expect(
    report.apiUsages.map((usage) => [
      usage.module,
      usage.path,
      usage.kind,
      usage.location.line,
    ]),
  ).toEqual([
    ["example-api", ["default", "run"], "call", 45],
    ["example-api", ["run"], "call", 46],
    ["example-namespace", ["*", "run"], "call", 47],
  ]);
});

it("abstains when duplicate ETS imports make module identity ambiguous", async () => {
  const root = await fixture(
    [
      'import { run } from "first-api"',
      'import { run } from "second-api"',
      "run()",
      "@Entry",
      "@Component",
      "struct Index {",
      "  build(): void {",
      "    Column() { Text('ambiguous') }",
      "  }",
      "}",
    ].join("\n"),
    "main.ets",
  );
  const report = await scanProject(root, target);
  expect({
    references: report.references.map((reference) => [
      reference.specifier,
      reference.location.line,
    ]),
    usages: report.apiUsages,
    limitations: report.coverage.limitations.filter((limitation) =>
      limitation.code.startsWith("ets-"),
    ),
  }).toEqual({
    references: [
      ["first-api", 1],
      ["second-api", 2],
    ],
    usages: [],
    limitations: [
      { code: "ets-arkui-dsl-not-analyzed", path: "main.ets" },
      { code: "ets-source-syntax-partially-analyzed", path: "main.ets" },
      { code: "ets-import-binding-ambiguous", path: "main.ets" },
      { code: "ets-type-check-partially-analyzed", path: "main.ets" },
    ],
  });
});

it("detects unshadowed Web and Node host globals while ignoring shadowed identifiers", async () => {
  const root = await fixture(
    [
      'fetch("https://example.invalid/ping");',
      'window.open("https://example.invalid");',
      'document.getElementById("root");',
      "new XMLHttpRequest();",
      'globalThis.localStorage.getItem("k");',
      "process.cwd();",
      'Buffer.from("abc");',
      "const win = window; win.scrollTo(0, 0);",
      'const { setItem } = localStorage; setItem("k", "v");',
      "function shadowed(fetch: () => void, process: { cwd(): string }) { fetch(); process.cwd(); }",
      "{ const window = { open() {} }; window.open(); }",
      "globalThis();",
      "this.fetch?.();",
    ].join("\n"),
  );
  const report = await scanProject(root, target);
  expect(
    report.apiUsages.map((u) => [u.module, u.path, u.kind, u.location.line]),
  ).toEqual([
    ["globalThis", ["fetch"], "call", 1],
    ["globalThis", ["window", "open"], "call", 2],
    ["globalThis", ["document", "getElementById"], "call", 3],
    ["globalThis", ["XMLHttpRequest"], "construct", 4],
    ["globalThis", ["localStorage", "getItem"], "call", 5],
    ["globalThis", ["process", "cwd"], "call", 6],
    ["globalThis", ["Buffer", "from"], "call", 7],
    ["globalThis", ["window", "scrollTo"], "call", 8],
    ["globalThis", ["localStorage", "setItem"], "call", 9],
  ]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([{ code: "unlisted-global-apis-not-analyzed" }]),
  );
});

it("excludes shadowed globals in .ets files with partial syntax", async () => {
  const root = await fixture(
    [
      "function test(fetch: () => void) {",
      "  fetch();",
      "}",
      "function unshadowed() {",
      '  fetch("https://example.invalid");',
      "}",
      "@Entry",
      "@Component",
      "struct Index {",
      "  build(): void {",
      "    Column() { Text('ok') }",
      "  }",
      "}",
    ].join("\n"),
    "main.ets",
  );
  const report = await scanProject(root, target);
  expect(
    report.apiUsages.map((u) => [u.module, u.path, u.location.line]),
  ).toEqual([["globalThis", ["fetch"], 5]]);
});

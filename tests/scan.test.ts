import { afterEach, describe, expect, it } from "vitest";
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
import type { ScanReport, TargetProfile } from "@arkcompat/contracts";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
};
const roots: string[] = [];
async function project(manifest: unknown = {}) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  return root;
}
async function source(root: string, text: string, name = "main.ts") {
  await writeFile(join(root, name), text);
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("offline scan slice", () => {
  it("retains dependency sections, alias declarations and unknown versions", async () => {
    const root = await project({
      dependencies: { alias: "npm:other@^2", shared: "^1" },
      devDependencies: { shared: "workspace:*" },
      optionalDependencies: { native: "*" },
      peerDependencies: { peer: "^3" },
    });
    const report = await scanProject(root, target);
    expect(
      report.dependencies.map((d) => [
        d.name,
        d.specifier,
        d.section,
        d.status,
      ]),
    ).toEqual([
      ["alias", "npm:other@^2", "dependencies", "unknown"],
      ["shared", "^1", "dependencies", "unknown"],
      ["shared", "workspace:*", "devDependencies", "unknown"],
      ["native", "*", "optionalDependencies", "unknown"],
      ["peer", "^3", "peerDependencies", "unknown"],
    ]);
  });
  it("extracts AST module references with one-based source locations, not comment text", async () => {
    const root = await project();
    await source(
      root,
      '// import "fake";\nimport fs from "node:fs";\nexport { x } from "lib";\nconst m = import("dynamic");\nimport(variable);',
    );
    const report = await scanProject(root, target);
    expect(
      report.references.map((r) => [r.kind, r.specifier, r.location.line]),
    ).toEqual([
      ["import", "node:fs", 2],
      ["export", "lib", 3],
      ["dynamic-import", "dynamic", 4],
      ["dynamic-import", null, 5],
    ]);
  });
  it("gives byte-identical schema-valid JSON across scans and CLI/core", async () => {
    const root = await project({ dependencies: { sample: "^1" } });
    await source(root, 'import "sample";');
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
    const validate = new Ajv({ allErrors: true }).compile(schema);
    expect({
      equal:
        JSON.stringify(report) ===
        JSON.stringify(await scanProject(root, target)),
      cli: JSON.parse(raw) as ScanReport,
      valid: validate(report),
      errors: validate.errors,
    }).toEqual({ equal: true, cli: report, valid: true, errors: null });
  });
  it("does not infer compatibility or execute lifecycle scripts", async () => {
    const root = await project({
      dependencies: { axios: "^1" },
      scripts: { preinstall: "exit 99" },
    });
    await source(root, 'import "node:fs";');
    const report = await scanProject(root, target);
    expect(report.findings.map((f) => [f.status, f.target, f.tier])).toEqual([
      ["unknown", target, "rule-static"],
      ["unknown", target, "rule-static"],
    ]);
  });
  it("reports lockfiles, ETS and CommonJS exports blind spots as incomplete coverage", async () => {
    const root = await project();
    await source(root, "{}", "oh-package-lock.json5");
    await source(root, "struct View {}", "view.ets");
    await source(root, 'const fs = require("fs");', "main.cjs");
    const report = await scanProject(root, target);
    expect(report.coverage.limitations.map((l) => l.code)).toEqual(
      expect.arrayContaining([
        "lockfile-not-analyzed",
        "unsupported-ets",
        "commonjs-exports-not-analyzed",
        "compatibility-not-evaluated",
      ]),
    );
  });
  it("skips symlinks and excluded trees, keeping external source out of reports", async () => {
    const root = await project();
    const outside = await project();
    await source(outside, 'import "external-secret";');
    await symlink(join(outside, "main.ts"), join(root, "linked.ts"));
    await mkdir(join(root, "node_modules"));
    await source(root, 'import "ignored";', "node_modules/ignored.ts");
    const report = await scanProject(root, target);
    expect({
      references: report.references,
      skips: report.coverage.limitations.some(
        (l) => l.code === "symlink-skipped",
      ),
    }).toEqual({ references: [], skips: true });
  });
  it.each([null, [], { dependencies: [] }, { dependencies: { bad: 42 } }])(
    "rejects invalid manifest %j",
    async (manifest) => {
      await expect(
        scanProject(await project(manifest), target),
      ).rejects.toThrow(/package.json/);
    },
  );
  it("fails on invalid JSON instead of emitting a successful report", async () => {
    const root = await project();
    await source(root, "{", "package.json");
    await expect(scanProject(root, target)).rejects.toThrow(/package.json/);
  });
  it("fails on malformed source rather than extracting partial AST results", async () => {
    const root = await project();
    await source(root, 'import { from "broken";');
    await expect(scanProject(root, target)).rejects.toThrow(/main.ts:1:/);
  });
  it("rejects missing target context and keeps stdout empty on CLI failure", async () => {
    const result = spawnSync(
      process.execPath,
      ["apps/cli/dist/index.js", "scan", await project()],
      { encoding: "utf8" },
    );
    expect({
      status: result.status,
      stdout: result.stdout,
      error: result.stderr.includes("--runtime"),
    }).toEqual({ status: 1, stdout: "", error: true });
  });
});

it("locates manifest declarations on their actual lines", async () => {
  const root = await project();
  await source(
    root,
    '{\n  "dependencies": {\n    "sample": "^1"\n  }\n}',
    "package.json",
  );
  const report = await scanProject(root, target);
  expect(report.findings[0]?.location).toEqual({
    path: "package.json",
    line: 3,
    column: 5,
  });
});
it("redacts credential-bearing dependency and import URLs", async () => {
  const root = await project({
    dependencies: {
      remote: "https://user:test-secret@example.invalid/pkg?token=test-token",
    },
  });
  await source(root, 'import "https://example.invalid/pkg?token=test-token";');
  expect(JSON.stringify(await scanProject(root, target))).not.toMatch(
    /test-secret|test-token|example.invalid/,
  );
});
it("rejects symlinked manifests", async () => {
  const root = await project();
  const outside = await project();
  await rm(join(root, "package.json"));
  await symlink(join(outside, "package.json"), join(root, "package.json"));
  await expect(scanProject(root, target)).rejects.toThrow(/package.json/);
});
it("rejects oversized input instead of returning a partial success", async () => {
  const root = await project();
  await source(root, " ".repeat(1024 * 1024 + 1));
  await expect(scanProject(root, target)).rejects.toThrow(/scan limits/);
});
it.each([
  { ...target, runtime: "invalid" },
  { ...target, release: "6" },
  { ...target, apiLevel: 0 },
])("rejects invalid target %j", async (value) => {
  await expect(
    scanProject(await project(), value as TargetProfile),
  ).rejects.toThrow(/Invalid target/);
});
it("schema rejects unsupported compatibility verdicts", async () => {
  const report = await scanProject(
    await project({ dependencies: { sample: "^1" } }),
    target,
  );
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  const invalid = {
    ...report,
    findings: report.findings.map((f) => ({
      ...f,
      status: "verified-compatible",
    })),
  };
  expect(new Ajv().compile(schema)(invalid)).toBe(false);
});

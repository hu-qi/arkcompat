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
async function fixture(text: string) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-ohpm-manifest-"));
  roots.push(root);
  await writeFile(join(root, "oh-package.json5"), text);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("reads JSON5 direct declarations at exact source locations", async () => {
  const root = await fixture(
    "{\n // metadata only\n dependencies: {\n   '@fixture/ported': '2.0.0',\n   remote: 'https://example.invalid?token=fixture-private',\n },\n devDependencies: { tool: '1.0.0' },\n}",
  );
  await writeFile(
    join(root, "oh-package-lock.json5"),
    "intentionally not read",
  );
  await mkdir(join(root, "oh_modules"));
  await writeFile(
    join(root, "oh_modules", "ignored.ts"),
    'import "outside-the-inventory";',
  );
  const report = await scanProject(root, target);
  expect(
    report.dependencies.map(({ name, section, specifier }) => [
      name,
      section,
      specifier,
    ]),
  ).toEqual([
    ["@fixture/ported", "dependencies", "2.0.0"],
    ["remote", "dependencies", "[redacted-url]"],
    ["tool", "devDependencies", "1.0.0"],
  ]);
  expect(
    report.findings.map(({ location, status }) => [
      location.path,
      location.line,
      location.column,
      status,
    ]),
  ).toEqual([
    ["oh-package.json5", 4, 4, "unknown"],
    ["oh-package.json5", 5, 4, "unknown"],
    ["oh-package.json5", 7, 21, "unknown"],
  ]);
  expect(report.dependencyGraph.source).toBeNull();
  expect(report.references).toEqual([]);
  expect(report.coverage.limitations).toContainEqual({
    code: "ohpm-lockfile-not-analyzed",
    path: "oh-package-lock.json5",
  });
  expect(JSON.stringify(report)).not.toContain("fixture-private");
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
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
  expect(JSON.parse(raw)).toEqual(report);
  const schema = JSON.parse(
    await readFile("packages/contracts/scan-report.schema.json", "utf8"),
  ) as object;
  expect(new Ajv().compile(schema)(report)).toBe(true);
});

it("exposes omitted nested and dynamic dependency sections", async () => {
  const root = await fixture("{ dynamicDependencies: { feature: '1.0.0' } }");
  const module = join(root, "entry");
  await mkdir(module);
  await writeFile(
    join(module, "oh-package.json5"),
    "{ dependencies: { item: '2.0.0' } }",
  );
  await writeFile(join(module, "main.ets"), "struct Sample {}");
  const report = await scanProject(root, target);
  expect(report.dependencies).toEqual([]);
  expect(report.coverage.limitations).toEqual(
    expect.arrayContaining([
      {
        code: "ohpm-dynamic-dependencies-not-analyzed",
        path: "oh-package.json5",
      },
      { code: "nested-manifest-not-analyzed", path: "entry/oh-package.json5" },
      { code: "unsupported-ets", path: "entry/main.ets" },
    ]),
  );
  expect((await scanProject(module, target)).dependencies[0]?.name).toBe(
    "item",
  );
});

it("keeps npm selection when both root manifests exist", async () => {
  const root = await fixture("{ invalid: deliberately-not-json5 }");
  await writeFile(
    join(root, "package.json"),
    '{"dependencies":{"npm-only":"1.0.0"}}',
  );
  const report = await scanProject(root, target);
  expect(report.dependencies[0]?.name).toBe("npm-only");
  expect(report.coverage.limitations).toContainEqual({
    code: "ohpm-manifest-not-analyzed",
    path: "oh-package.json5",
  });
});

it.each([
  "{ dependencies: { key: 12 } }",
  "{ dependencies: { key: '1.0.0' }, broken }",
])("rejects malformed or unsupported manifests: %s", async (text) => {
  await expect(scanProject(await fixture(text), target)).rejects.toThrow(
    /oh-package.json5/,
  );
});

it("does not follow the OHPM manifest symlink", async () => {
  const root = await fixture("{}");
  await rm(join(root, "oh-package.json5"));
  await writeFile(
    join(root, "target.json5"),
    "{dependencies:{private:'1.0.0'}}",
  );
  await symlink(join(root, "target.json5"), join(root, "oh-package.json5"));
  await expect(scanProject(root, target)).rejects.toThrow(
    /Cannot read oh-package.json5/,
  );
});

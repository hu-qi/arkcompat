import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterEach, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const eslintPackage = require.resolve("eslint/package.json");
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

it("bounds ESLint's resolved matcher expansion for repeated parent globstars", () => {
  // Resolve through the consumer, so a second vulnerable transitive copy cannot
  // be hidden by a patched direct test dependency. Keep the old-version case small.
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { createRequire } from 'node:module';
       const { Minimatch } = createRequire(${JSON.stringify(eslintPackage)})('minimatch');
       const matcher = new Minimatch(Array(8).fill('**/../a/b').join('/'), {
         optimizationLevel: 2, braceExpandMax: 16
       });
       console.log(matcher.set.length);`,
    ],
    { encoding: "utf8", timeout: 3000 },
  );
  expect(Number(output.trim())).toBeLessThanOrEqual(16);
});

it("keeps ESLint nested brace selection and ignore patterns effective", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "arkcompat-lint-")));
  roots.push(root);
  const files = [
    "src/a.js",
    "src/deep/b.mjs",
    "src/ignored/c.js",
    "other/d.js",
  ];
  for (const file of files) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), "debugger;\n");
  }
  // A warning verifies rule execution without requiring a failing process exit
  // to distinguish a lint diagnostic from a toolchain crash.
  const output = execFileSync(
    process.execPath,
    [
      join(dirname(eslintPackage), "bin/eslint.js"),
      "--no-config-lookup",
      "--rule",
      "no-debugger:warn",
      "--ignore-pattern",
      "**/ignored/**",
      "--format",
      "json",
      "src/**/*.{js,mjs}",
    ],
    { cwd: root, encoding: "utf8", timeout: 3000 },
  );
  const results = JSON.parse(output) as {
    filePath: string;
    messages: { ruleId: string }[];
  }[];
  expect(
    results.map((result) => ({
      path: relative(root, result.filePath).replaceAll("\\", "/"),
      rules: result.messages.map((message) => message.ruleId),
    })),
  ).toEqual([
    { path: "src/a.js", rules: ["no-debugger"] },
    { path: "src/deep/b.mjs", rules: ["no-debugger"] },
  ]);
});

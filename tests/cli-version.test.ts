import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const cli = "apps/cli/dist/index.js";

function run(args: string[]) {
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
  }).trim();
}

it("reports the release identity instead of printing usage", () => {
  const manifest = JSON.parse(
    readFileSync("apps/cli/package.json", "utf8"),
  ) as { version: string };
  expect({
    long: run(["--version"]),
    short: run(["-v"]),
    command: run(["version"]),
  }).toEqual({
    long: `arkcompat ${manifest.version}`,
    short: `arkcompat ${manifest.version}`,
    command: `arkcompat ${manifest.version}`,
  });
});

it("keeps help output and rejects an unknown version flag", () => {
  expect(run(["--help"])).toContain("arkcompat --version");
  expect(() => run(["--version", "extra"])).toThrow();
});

it("ships patch 0.1.1 consistently across runtime, packages and the DevEco descriptor", () => {
  const packagePaths = [
    "package.json",
    "apps/cli/package.json",
    "apps/evaluate/package.json",
    "apps/mcp/package.json",
    "apps/vscode/package.json",
    "apps/web/package.json",
    "packages/contracts/package.json",
    "packages/core/package.json",
    "packages/evaluation/package.json",
    "packages/knowledge/package.json",
  ];
  const versions = packagePaths.map(
    (path) =>
      (JSON.parse(readFileSync(path, "utf8")) as { version: string }).version,
  );
  versions.push(run(["--version"]).replace("arkcompat ", ""));
  versions.push(
    readFileSync("apps/deveco/plugin.xml", "utf8").match(
      /<version>([^<]+)<\/version>/,
    )?.[1] ?? "missing",
  );
  expect(versions).toEqual(
    packagePaths.concat("runtime", "deveco").map(() => "0.1.1"),
  );
});

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

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { scanWithCli, editorLocation } from "../apps/vscode/dist/runner.cjs";
const cli = resolve("apps/cli/dist/index.js");
const project = resolve("fixtures/developer/source-api");
const target = {
  os: "HarmonyOS" as const,
  runtime: "arkts" as const,
  release: "6.0.0",
  apiLevel: 20,
};
it("consumes the same complete canonical CLI report with unknown findings", async () => {
  const expected = JSON.parse(
    execFileSync(
      process.execPath,
      [
        cli,
        "scan",
        project,
        "--runtime",
        "arkts",
        "--release",
        "6.0.0",
        "--api-level",
        "20",
      ],
      { encoding: "utf8" },
    ),
  );
  expect(await scanWithCli(process.execPath, cli, project, target)).toEqual(
    expected,
  );
});
it("refuses a relative Node executable and reports private scan failures concisely", async () => {
  await expect(scanWithCli("node", cli, project, target)).rejects.toThrow(
    "Configure an absolute Node executable path.",
  );
  await expect(
    scanWithCli(process.execPath, cli, project, {
      ...target,
      release: "PRIVATE_INVALID_RELEASE",
    }),
  ).rejects.toThrow(
    "Local scanner failed; check the target, inputs and scan limits.",
  );
});
it.each([
  "../source.ts",
  "/absolute.ts",
  "C:\\private.ts",
  "src/../source.ts",
  "src\\source.ts",
  "https://example.invalid",
])("rejects locations outside the workspace: %s", (path) => {
  expect(() => editorLocation({ path, line: 1, column: 1 })).toThrow(
    "Invalid scanner location.",
  );
});
it("converts canonical one-based UTF-16 locations without changing file identity", () => {
  expect(
    editorLocation({ path: "src/example.ts", line: 7, column: 13 }),
  ).toEqual({ parts: ["src", "example.ts"], line: 6, column: 12 });
});

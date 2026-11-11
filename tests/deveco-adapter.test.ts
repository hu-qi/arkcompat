import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const pluginXml = readFileSync("apps/deveco/plugin.xml", "utf8");
const actionSource = readFileSync(
  "apps/deveco/src/org/arkcompat/deveco/ArkCompatScanAction.java",
  "utf8",
);

it("exposes one explicit exact-host Tools action and no startup activity", () => {
  expect(pluginXml).toContain(
    '<idea-version since-build="261.23567.138" until-build="261.23567.138"/>',
  );
  expect(pluginXml).toContain('id="ArkCompat.ScanProject"');
  expect(pluginXml).toContain(
    'class="org.arkcompat.deveco.ArkCompatScanAction"',
  );
  expect(pluginXml).toContain(
    '<add-to-group group-id="ToolsMenu" anchor="last"/>',
  );
  expect(pluginXml).not.toMatch(
    /<postStartupActivity|<applicationService|<projectService|<applicationConfigurator|<projectActivity/,
  );
});

it("resolves the embedded CLI beside the plugin JAR without shell execution", () => {
  expect(actionSource).toContain(
    'Path cli = jar.getParent().resolve("runtime/dist/index.js");',
  );
  expect(actionSource).toContain("builder.environment().clear();");
  expect(actionSource).not.toMatch(
    /Runtime\.getRuntime\(\)\.exec|\/bin\/sh|ProcessBuilder\(.*String/,
  );
});

it("projects the canonical fixture findings consumed by the exact-host smoke", () => {
  const report = JSON.parse(
    execFileSync(
      process.execPath,
      [
        resolve("apps/cli/dist/index.js"),
        "scan",
        resolve("spikes/deveco/fixture"),
        "--runtime",
        "arkts",
        "--release",
        "6.0.0",
        "--api-level",
        "20",
      ],
      { encoding: "utf8" },
    ),
  ) as {
    schemaVersion: string;
    findings: {
      id: string;
      status: string;
      location: { path: string; line: number; column: number };
    }[];
  };

  expect(report.schemaVersion).toBe("0.12.0");
  expect(
    report.findings.map(({ id, status, location }) => ({
      id,
      status,
      location,
    })),
  ).toEqual([
    {
      id: "84d092148e09f27f9afa8c3018f8f8a8e68f56ac6cd0c3576d2d8b7e30df99b2",
      status: "unknown",
      location: { path: "main.ts", line: 1, column: 1 },
    },
    {
      id: "6a47b7649024f0fa4641ecd9c65bac07f5b549dcc65f03fbc15f59337cf5adf5",
      status: "unknown",
      location: { path: "main.ts", line: 2, column: 1 },
    },
  ]);
});

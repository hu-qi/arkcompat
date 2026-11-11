import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const pack = "scripts/package-cli.mjs";

it("runs the portable CLI after relocation without source, local paths or symlinks", async () => {
  const parent = await mkdtemp(join(tmpdir(), "arkcompat-cli-test-"));
  try {
    const output = join(parent, "output with spaces");
    const build = spawnSync(process.execPath, [pack, output], {
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(build.status, build.stderr).toBe(0);
    const runtime = join(parent, "relocated");
    await rename(output, runtime);
    const entries = await readdir(runtime, {
      recursive: true,
      withFileTypes: true,
    });
    expect(entries.some((entry) => entry.isSymbolicLink())).toBe(false);
    expect((await readdir(runtime)).sort()).toEqual([
      "LICENSE",
      "THIRD-PARTY-NOTICES.json",
      "dist",
      "node_modules",
      "package.json",
    ]);
    for (const name of ["contracts", "core", "knowledge"]) {
      expect(
        await readdir(join(runtime, "node_modules", "@arkcompat", name)),
      ).not.toContain("src");
    }
    const manifest = await readFile(join(runtime, "package.json"), "utf8");
    expect(manifest).not.toMatch(/file:|workspace:/);
    expect(await readdir(join(runtime, "node_modules"))).not.toContain(
      ".modules.yaml",
    );
    expect(await readFile(join(runtime, "LICENSE"), "utf8")).toBe(
      await readFile("LICENSE", "utf8"),
    );
    const notices = await readFile(
      join(runtime, "THIRD-PARTY-NOTICES.json"),
      "utf8",
    );
    const ajvNotice = await readFile(join(runtime, "node_modules/ajv/LICENSE"));
    expect(notices).not.toContain(parent);
    expect(JSON.parse(notices)).toMatchObject({
      assessment: "file-inventory-only",
      packages: expect.arrayContaining([
        expect.objectContaining({
          name: "@yarnpkg/lockfile",
          version: "1.1.0",
          declaredLicense: "BSD-2-Clause",
          licenseFiles: [],
          gaps: ["missing-license-file"],
        }),
        expect.objectContaining({
          name: "ajv",
          gaps: [],
          licenseFiles: [
            {
              path: "node_modules/ajv/LICENSE",
              sha256: createHash("sha256").update(ajvNotice).digest("hex"),
            },
          ],
        }),
      ]),
    });
    const target = [
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ];
    const inventoryArgs = [
      "scan",
      resolve("fixtures/developer/inventory"),
      ...target,
    ];
    const inventoryScan = spawnSync(
      process.execPath,
      ["apps/cli/dist/index.js", ...inventoryArgs],
      { encoding: "utf8" },
    );
    expect(inventoryScan.status, inventoryScan.stderr).toBe(0);
    const inventoryReport = JSON.parse(inventoryScan.stdout) as {
      findings: { id: string }[];
    };
    const findingId = inventoryReport.findings[0]!.id;
    const capture = join(parent, "capture.json");
    await writeFile(
      capture,
      JSON.stringify({
        name: "@fixture/portable",
        versions: { "1.0.0": { name: "@fixture/portable", version: "1.0.0" } },
      }),
    );
    for (const args of [
      inventoryArgs,
      [
        "explain",
        resolve("fixtures/developer/inventory"),
        "--finding-id",
        findingId,
        ...target,
      ],
      [
        "api-rules",
        resolve("fixtures/developer/source-api"),
        ...target,
        "--rules",
        resolve("fixtures/developer/api-rules/snapshot.json"),
      ],
      [
        "knowledge-export",
        resolve("fixtures/developer/knowledge/snapshot.json"),
      ],
      [
        "ohpm-evidence",
        capture,
        "@fixture/portable",
        "1.0.0",
        "2026-11-10T00:00:00Z",
      ],
    ]) {
      const expected = spawnSync(
        process.execPath,
        ["apps/cli/dist/index.js", ...args],
        { encoding: "utf8" },
      );
      const actual = spawnSync(process.execPath, ["dist/index.js", ...args], {
        cwd: runtime,
        encoding: "utf8",
        env: { ...process.env, NODE_PATH: "" },
      });
      expect(expected.status, expected.stderr).toBe(0);
      expect(actual.status, actual.stderr).toBe(0);
      expect(actual.stdout).toBe(expected.stdout);
    }
    expect(
      await readFile(
        join(
          runtime,
          "node_modules",
          "@arkcompat",
          "contracts",
          "finding-explanation.schema.json",
        ),
      ),
    ).toEqual(
      await readFile("packages/contracts/finding-explanation.schema.json"),
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}, 45_000);

it("does not overwrite an existing output directory", async () => {
  const parent = await mkdtemp(join(tmpdir(), "arkcompat-cli-collision-"));
  try {
    const output = join(parent, "existing");
    await mkdir(output);
    await writeFile(join(output, "keep.txt"), "keep");
    const result = spawnSync(process.execPath, [pack, output], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Output directory already exists");
    expect(await readdir(output)).toEqual(["keep.txt"]);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

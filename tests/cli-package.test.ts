import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  unlink,
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
      "SBOM.cdx.json",
      "SHA256SUMS",
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
    expect(JSON.parse(manifest)).toMatchObject({
      license: "MIT",
      dependencies: {
        "@arkcompat/contracts": "0.0.0",
        "@arkcompat/core": "0.0.0",
        "@arkcompat/knowledge": "0.0.0",
      },
    });
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
          supplementalLicenseSources: [
            {
              kind: "upstream-tag",
              source:
                "https://raw.githubusercontent.com/yarnpkg/yarn/v1.1.0/LICENSE",
              sourceTag: "v1.1.0",
              sourceCommit: "ee5d4a153a3fe85145c45c0bb251ffffffcfe210",
              sha256:
                "ae09761b5d27e237571245437653b483bbb85de3cc64b802e8ef47d03aabec1e",
            },
          ],
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
    const bomText = await readFile(join(runtime, "SBOM.cdx.json"), "utf8");
    const bom = JSON.parse(bomText) as {
      bomFormat: string;
      specVersion: string;
      components: { name: string; group?: string; version: string }[];
      dependencies: { ref: string; dependsOn: string[] }[];
    };
    expect({
      bomFormat: bom.bomFormat,
      specVersion: bom.specVersion,
      rootDependencyCount: bom.dependencies[0]?.dependsOn.length,
      components: bom.components.map(({ group, name, version }) => [
        group,
        name,
        version,
      ]),
    }).toEqual({
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      rootDependencyCount: 3,
      components: [
        ["@arkcompat", "contracts", "0.0.0"],
        ["@arkcompat", "core", "0.0.0"],
        ["@arkcompat", "knowledge", "0.0.0"],
        ["@yarnpkg", "lockfile", "1.1.0"],
        [undefined, "ajv", "8.20.0"],
        [undefined, "balanced-match", "4.0.4"],
        [undefined, "brace-expansion", "5.0.12"],
        [undefined, "fast-deep-equal", "3.1.3"],
        [undefined, "fast-uri", "3.1.9"],
        [undefined, "json-schema-traverse", "1.0.0"],
        [undefined, "json5", "2.2.3"],
        [undefined, "require-from-string", "2.0.2"],
        [undefined, "semver", "7.8.6"],
        [undefined, "typescript", "5.9.3"],
        [undefined, "yaml", "2.9.1"],
      ],
    });
    expect(bomText).not.toContain(parent);
    const sums = (await readFile(join(runtime, "SHA256SUMS"), "utf8"))
      .trim()
      .split("\n");
    expect(sums.some((line) => line.endsWith("  SBOM.cdx.json"))).toBe(true);
    expect(sums.some((line) => line.endsWith("  SHA256SUMS"))).toBe(false);
    for (const line of sums) {
      const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
      expect(match, line).not.toBeNull();
      const path = match![2]!;
      const actual = createHash("sha256")
        .update(await readFile(join(runtime, path)))
        .digest("hex");
      expect(actual, path).toBe(match![1]);
    }
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

it("rehearses verified upgrade, rollback, offline execution and uninstall", async () => {
  const parent = await mkdtemp(join(tmpdir(), "arkcompat-cli-lifecycle-"));
  const releases = join(parent, "releases");
  const first = join(releases, "first");
  const second = join(releases, "second");
  const current = join(parent, "current");
  const project = join(parent, "project");
  try {
    await mkdir(releases, { recursive: true });
    await mkdir(project);
    await writeFile(
      join(project, "package.json"),
      JSON.stringify({ dependencies: { sample: "^1.0.0" } }),
    );

    const build = spawnSync(process.execPath, [pack, first], {
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(build.status, build.stderr).toBe(0);
    await cp(first, second, { recursive: true, verbatimSymlinks: true });

    await symlink(join("releases", "first"), current, "dir");
    const runCurrent = () =>
      spawnSync(
        process.execPath,
        [
          join(current, "dist", "index.js"),
          "scan",
          project,
          "--runtime",
          "arkts",
          "--release",
          "6.0.0",
          "--api-level",
          "20",
        ],
        {
          cwd: parent,
          encoding: "utf8",
          env: {
            ...process.env,
            ALL_PROXY: "http://127.0.0.1:9",
            HTTP_PROXY: "http://127.0.0.1:9",
            HTTPS_PROXY: "http://127.0.0.1:9",
            NODE_PATH: "",
            NO_PROXY: "",
          },
        },
      );

    const initial = runCurrent();
    expect(initial.status, initial.stderr).toBe(0);
    expect(JSON.parse(initial.stdout)).toMatchObject({
      dependencies: [
        {
          name: "sample",
          specifier: "^1.0.0",
          status: "unknown",
        },
      ],
    });

    const verify = (runtime: string) =>
      spawnSync(
        process.execPath,
        ["scripts/validate-runtime-provenance.mjs", runtime],
        { encoding: "utf8" },
      );
    expect(verify(first).status).toBe(0);
    expect(verify(second).status).toBe(0);

    await writeFile(
      join(second, "dist", "index.js"),
      `${await readFile(join(second, "dist", "index.js"), "utf8")}\n`,
    );
    const corrupt = verify(second);
    expect(corrupt.status).toBe(1);
    expect(corrupt.stderr).toContain("Checksum mismatch for dist/index.js");
    expect(await readlink(current)).toBe(join("releases", "first"));
    expect(runCurrent().status).toBe(0);

    await rm(second, { recursive: true, force: true });
    await cp(first, second, { recursive: true, verbatimSymlinks: true });
    expect(verify(second).status).toBe(0);

    const switchTo = async (target: string) => {
      const next = `${current}.next`;
      await unlink(next).catch(() => undefined);
      await symlink(join("releases", target), next, "dir");
      await rename(next, current);
    };
    await switchTo("second");
    expect(await readlink(current)).toBe(join("releases", "second"));
    expect(runCurrent().status).toBe(0);

    await switchTo("first");
    expect(await readlink(current)).toBe(join("releases", "first"));
    expect(runCurrent().status).toBe(0);

    await unlink(current);
    await rm(releases, { recursive: true, force: true });
    await expect(lstat(current)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await lstat(parent)).isDirectory()).toBe(true);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}, 45_000);

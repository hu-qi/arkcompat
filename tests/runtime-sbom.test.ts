import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const script = "scripts/runtime-sbom.mjs";
const noticesScript = "scripts/runtime-notices.mjs";
const validator = "scripts/validate-runtime-provenance.mjs";

async function writePackage(
  runtime: string,
  path: string,
  manifest: object,
  files: Record<string, string> = {},
) {
  const directory = join(runtime, path);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "package.json"), JSON.stringify(manifest));
  for (const [name, value] of Object.entries(files))
    await writeFile(join(directory, name), value);
}

async function fixture() {
  const runtime = await mkdtemp(join(tmpdir(), "arkcompat-runtime-sbom-"));
  await writeFile(
    join(runtime, "package.json"),
    JSON.stringify({
      name: "@fixture/runtime",
      version: "1.0.0",
      private: true,
      license: "MIT",
      dependencies: {
        "@fixture/lib": "1.0.0",
        nested: "1.0.0",
      },
      optionalDependencies: { "@fixture/missing-root-optional": "1.0.0" },
    }),
  );
  await writePackage(runtime, "node_modules/@fixture/lib", {
    name: "@fixture/lib",
    version: "1.0.0",
    license: "MIT",
    dependencies: { nested: "1.0.0" },
    optionalDependencies: { "@fixture/missing-optional": "1.0.0" },
    peerDependencies: { "@fixture/missing-peer": "^1.0.0" },
  });
  await writePackage(runtime, "node_modules/@fixture/lib/node_modules/nested", {
    name: "nested",
    version: "1.0.0",
    license: "ISC",
  });
  await writePackage(
    runtime,
    "node_modules/nested",
    { name: "nested", version: "1.0.0", license: "Apache-2.0" },
    { "LICENSE.txt": "fixture license\n" },
  );
  return runtime;
}

function run(runtime: string) {
  return spawnSync(process.execPath, [script, runtime], {
    encoding: "utf8",
    timeout: 10_000,
  });
}

function writeNotices(runtime: string) {
  return spawnSync(process.execPath, [noticesScript, runtime], {
    encoding: "utf8",
    timeout: 10_000,
  });
}

function validate(runtime: string) {
  return spawnSync(process.execPath, [validator, runtime], {
    encoding: "utf8",
    timeout: 10_000,
  });
}

async function verifyChecksums(runtime: string) {
  const sums = (await readFile(join(runtime, "SHA256SUMS"), "utf8"))
    .trim()
    .split("\n");
  expect(sums.some((line) => line.endsWith("  SHA256SUMS"))).toBe(false);
  for (const line of sums) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    expect(match, line).not.toBeNull();
    const actual = createHash("sha256")
      .update(await readFile(join(runtime, match![2]!)))
      .digest("hex");
    expect(actual, match![2]!).toBe(match![1]);
  }
}

it("writes a deterministic CycloneDX inventory with dependency edges and checksums", async () => {
  const first = await fixture();
  const second = await fixture();
  try {
    for (const runtime of [first, second]) {
      const result = run(runtime);
      expect(result.status, result.stderr).toBe(0);
    }
    const [firstBom, secondBom] = await Promise.all([
      readFile(join(first, "SBOM.cdx.json"), "utf8"),
      readFile(join(second, "SBOM.cdx.json"), "utf8"),
    ]);
    expect(firstBom).toBe(secondBom);
    expect(firstBom).not.toContain(first);
    const bom = JSON.parse(firstBom) as {
      metadata: {
        component: {
          name: string;
          group?: string;
          purl: string;
          properties: { name: string; value: string }[];
        };
      };
      components: {
        name: string;
        version: string;
        group?: string;
        scope?: string;
        purl: string;
        "bom-ref": string;
        properties: { name: string; value: string }[];
      }[];
      dependencies: { ref: string; dependsOn: string[] }[];
    };
    const components = bom.components.map(({ group, name, purl }) => [
      group,
      name,
      purl,
    ]);
    expect({
      root: [bom.metadata.component.group, bom.metadata.component.name],
      components,
      dependencyCounts: bom.dependencies.map(
        ({ dependsOn }) => dependsOn.length,
      ),
    }).toEqual({
      root: ["@fixture", "runtime"],
      components: [
        ["@fixture", "lib", "pkg:npm/%40fixture/lib@1.0.0"],
        [undefined, "nested", "pkg:npm/nested@1.0.0"],
        [undefined, "nested", "pkg:npm/nested@1.0.0"],
      ],
      dependencyCounts: [2, 1, 0, 0],
    });
    const references = new Set(
      bom.components.map((component) => component["bom-ref"]),
    );
    expect(references.size).toBe(3);
    expect(bom.components.every(({ scope }) => scope === undefined)).toBe(true);
    expect(bom.metadata.component.properties).toContainEqual({
      name: "arkcompat:unresolved-dependency-declarations",
      value: "optionalDependencies:@fixture/missing-root-optional",
    });
    expect(
      bom.components.find(
        ({ group, name }) => group === "@fixture" && name === "lib",
      )?.properties,
    ).toContainEqual({
      name: "arkcompat:unresolved-dependency-declarations",
      value:
        "optionalDependencies:@fixture/missing-optional,peerDependencies:@fixture/missing-peer",
    });
    const yarn = bom.components.find(
      ({ group, name, version }) =>
        group === "@yarnpkg" && name === "lockfile" && version === "1.1.0",
    );
    expect(yarn).toBeUndefined();
    for (const dependency of bom.dependencies.slice(1))
      for (const ref of dependency.dependsOn)
        expect(references.has(ref)).toBe(true);
    await verifyChecksums(first);
    await verifyChecksums(second);
    const validation = validate(first);
    expect(validation.status, validation.stderr).toBe(0);
    expect(validation.stdout).toContain(
      "3 components, 4 dependency entries, 6 files",
    );
  } finally {
    await Promise.all([
      rm(first, { recursive: true, force: true }),
      rm(second, { recursive: true, force: true }),
    ]);
  }
});

it("keeps the missing file gap and supplements only the exact Yarn lockfile release", async () => {
  const runtime = await fixture();
  try {
    await writePackage(runtime, "node_modules/@yarnpkg/lockfile", {
      name: "@yarnpkg/lockfile",
      version: "1.1.0",
      license: "BSD-2-Clause",
    });
    await writePackage(runtime, "node_modules/@yarnpkg/other", {
      name: "@yarnpkg/lockfile",
      version: "1.1.1",
      license: "BSD-2-Clause",
    });
    const noticesResult = writeNotices(runtime);
    expect(noticesResult.status, noticesResult.stderr).toBe(0);
    const result = run(runtime);
    expect(result.status, result.stderr).toBe(0);
    const notices = JSON.parse(
      await readFile(join(runtime, "THIRD-PARTY-NOTICES.json"), "utf8"),
    ) as {
      packages: {
        version: string;
        installPath: string;
        gaps: string[];
        supplementalLicenseSources: {
          kind: string;
          source: string;
          sourceTag: string;
          sourceCommit: string;
          sha256: string;
        }[];
      }[];
    };
    const exact = notices.packages.find(
      ({ installPath }) => installPath === "node_modules/@yarnpkg/lockfile",
    );
    expect(exact).toMatchObject({
      version: "1.1.0",
      gaps: ["missing-license-file"],
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
    });
    const other = notices.packages.find(
      ({ installPath }) => installPath === "node_modules/@yarnpkg/other",
    );
    expect(other).toMatchObject({
      version: "1.1.1",
      gaps: ["missing-license-file"],
      supplementalLicenseSources: [],
    });

    const bomText = await readFile(join(runtime, "SBOM.cdx.json"), "utf8");
    const bom = JSON.parse(bomText) as {
      components: {
        group?: string;
        name: string;
        version: string;
        properties: { name: string; value: string }[];
      }[];
    };
    const yarn = bom.components.find(
      ({ group, name, version }) =>
        group === "@yarnpkg" && name === "lockfile" && version === "1.1.0",
    );
    expect(yarn?.properties).toContainEqual({
      name: "arkcompat:notice-gaps",
      value: "missing-license-file",
    });
    expect(yarn?.properties).toContainEqual({
      name: "arkcompat:supplemental-license-sources",
      value:
        "v1.1.0:ee5d4a153a3fe85145c45c0bb251ffffffcfe210:ae09761b5d27e237571245437653b483bbb85de3cc64b802e8ef47d03aabec1e",
    });
    expect(bomText).not.toContain(runtime);
    expect(validate(runtime).status).toBe(0);
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});

it("rejects tampered SBOM content and runtime files", async () => {
  const runtime = await fixture();
  try {
    const generated = run(runtime);
    expect(generated.status, generated.stderr).toBe(0);
    const original = await readFile(join(runtime, "SBOM.cdx.json"), "utf8");
    await writeFile(
      join(runtime, "SBOM.cdx.json"),
      original.replace('"bomFormat": "CycloneDX"', '"bomFormat": "Other"'),
    );
    const invalidBom = validate(runtime);
    expect(invalidBom.status).toBe(1);
    expect(invalidBom.stderr).toContain("failed CycloneDX 1.5 validation");

    await writeFile(join(runtime, "SBOM.cdx.json"), original);
    await writeFile(
      join(runtime, "node_modules/nested/LICENSE.txt"),
      "changed",
    );
    const changedFile = validate(runtime);
    expect(changedFile.status).toBe(1);
    expect(changedFile.stderr).toContain(
      "Checksum mismatch for node_modules/nested/LICENSE.txt",
    );
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});

it("rejects symlinked runtime packages", async () => {
  const runtime = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "arkcompat-runtime-outside-"));
  try {
    const linked = join(runtime, "node_modules", "linked");
    await writePackage(outside, "", {
      name: "linked",
      version: "1.0.0",
      license: "MIT",
    });
    await rm(join(runtime, "node_modules", "nested"), {
      recursive: true,
      force: true,
    });
    await symlink(outside, linked);
    const result = run(runtime);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("is a symlink");
  } finally {
    await Promise.all([
      rm(runtime, { recursive: true, force: true }),
      rm(outside, { recursive: true, force: true }),
    ]);
  }
});

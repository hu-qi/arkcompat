import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { inspectOhpmCapture } from "../packages/knowledge/src/index.js";

const name = "@fixture/ported";
const version = "2.0.0";
const observedAt = "2026-11-08T01:02:03Z";
const entry = { name, version, license: "MIT" };
const metadata = {
  name,
  versions: {
    [version]: {
      ...entry,
      dist: {
        tarball: "https://example.invalid/path?credential=fixture-private",
      },
    },
  },
  "dist-tags": { latest: "3.0.0" },
};
const capture = JSON.stringify(metadata);

it("projects only the exact release record with reproducible evidence", () => {
  const result = inspectOhpmCapture(capture, name, version, observedAt);
  expect(result).toMatchObject({
    status: "release-observed",
    compatibility: "unknown",
    package: name,
    version,
    observedAt,
    declaredLicense: "MIT",
    evidence: {
      sha256: createHash("sha256").update(capture).digest("hex"),
      trust: "caller-supplied-unverified",
    },
  });
  expect(JSON.stringify(result)).not.toMatch(
    /credential|fixture-private|tarball/,
  );
  expect(inspectOhpmCapture(capture, name, version, observedAt)).toEqual(
    result,
  );
});
it("abstains when only a tag or another release exists", () => {
  expect(inspectOhpmCapture(capture, name, "3.0.0", observedAt)).toMatchObject({
    status: "unknown",
    reason: "version-not-in-capture",
    compatibility: "unknown",
    declaredLicense: null,
  });
});
it.each([undefined, "https://example.invalid/license?private=yes", 12])(
  "keeps an unavailable license unknown (%#)",
  (license) => {
    const text = JSON.stringify({
      ...metadata,
      versions: { [version]: { ...entry, license } },
    });
    expect(inspectOhpmCapture(text, name, version, observedAt)).toMatchObject({
      status: "release-observed",
      declaredLicense: null,
    });
  },
);
it.each([
  ["{", name, version, observedAt],
  ["[]", name, version, observedAt],
  [JSON.stringify({ ...metadata, name: "wrong" }), name, version, observedAt],
  [JSON.stringify({ name, versions: [] }), name, version, observedAt],
  [
    JSON.stringify({
      name,
      versions: { [version]: { ...entry, version: "2.1.0" } },
    }),
    name,
    version,
    observedAt,
  ],
  [
    JSON.stringify({ name, versions: { [version]: null } }),
    name,
    version,
    observedAt,
  ],
  [capture, "../invalid", version, observedAt],
  [capture, name, "latest", observedAt],
  [capture, name, version, "2026-02-30T00:00:00Z"],
  [" ".repeat(2 * 1024 * 1024 + 1), name, version, observedAt],
])("rejects invalid capture or selector %#", (text, pkg, release, when) => {
  expect(() => inspectOhpmCapture(text, pkg, release, when)).toThrow(
    /Invalid OHPM/,
  );
});
it("matches the library via the built CLI and withholds output for a symlink", async () => {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-ohpm-"));
  try {
    const file = join(root, "capture.json");
    const link = join(root, "private-link.json");
    await writeFile(file, capture);
    await symlink(file, link);
    const run = (input: string) =>
      spawnSync(
        process.execPath,
        [
          "apps/cli/dist/index.js",
          "ohpm-evidence",
          input,
          name,
          version,
          observedAt,
        ],
        { encoding: "utf8" },
      );
    const valid = run(file);
    expect(valid.status).toBe(0);
    expect(JSON.parse(valid.stdout)).toEqual(
      inspectOhpmCapture(capture, name, version, observedAt),
    );
    const invalid = run(link);
    expect({ status: invalid.status, stdout: invalid.stdout }).toEqual({
      status: 1,
      stdout: "",
    });
    expect(invalid.stderr).not.toContain(link);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

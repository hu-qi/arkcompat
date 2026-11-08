import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import {
  exportKnowledge,
  importKnowledge,
} from "../packages/knowledge/src/index.js";

const fixture = "fixtures/developer/knowledge/snapshot.json";
const cli = "apps/cli/dist/index.js";
function invoke(...args: string[]) {
  return spawnSync(process.execPath, [cli, "knowledge-export", ...args], {
    encoding: "utf8",
  });
}

it("exports canonical knowledge bytes without promoting candidate records", async () => {
  const expected = exportKnowledge(
    importKnowledge(await readFile(fixture, "utf8")),
  );
  const result = invoke(fixture);
  expect({
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }).toEqual({
    status: 0,
    stderr: "",
    stdout: expected,
  });
  expect(JSON.parse(result.stdout).records[0].review.state).toBe("candidate");
  expect(invoke(fixture).stdout).toBe(result.stdout);
});

it("withholds all output on unsafe or invalid snapshot inputs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arkcompat-export-"));
  try {
    const link = join(dir, "private-link.json");
    const invalid = join(dir, "private-invalid.json");
    const large = join(dir, "private-large.json");
    const nonUtf8 = join(dir, "private-bytes.json");
    await symlink(resolve(fixture), link);
    await writeFile(invalid, '{"private-metadata":"not-a-knowledge-snapshot"}');
    await writeFile(large, Buffer.alloc(2 * 1024 * 1024 + 1));
    await writeFile(nonUtf8, Buffer.from([0xff]));
    for (const path of [
      link,
      invalid,
      large,
      nonUtf8,
      join(dir, "missing.json"),
      dir,
    ]) {
      const result = invoke(path);
      expect({ status: result.status, stdout: result.stdout }).toEqual({
        status: 1,
        stdout: "",
      });
      expect(result.stderr).toMatch(/knowledge (snapshot|metadata)/);
      expect(result.stderr).not.toMatch(
        /private-|not-a-knowledge-snapshot|arkcompat-export-/,
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 15_000);

it("requires exactly one explicit snapshot path", () => {
  for (const args of [[], ["--runtime"], [fixture, "extra.json"]]) {
    const result = invoke(...args);
    expect({ status: result.status, stdout: result.stdout }).toEqual({
      status: 1,
      stdout: "",
    });
    expect(result.stderr).toContain("knowledge-export <snapshot.json>");
  }
});

import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import type { KnowledgeSnapshot } from "@arkcompat/contracts";
import {
  importKnowledge,
  isKnowledgeTimestamp,
  knowledgeSnapshotByteLimit,
  readKnowledgeSnapshot,
} from "../packages/knowledge/src/index.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function directory() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-knowledge-file-"));
  roots.push(root);
  return root;
}

it("reads the canonical developer snapshot without activating it", async () => {
  const root = await directory();
  const path = join(root, "snapshot.json");
  await writeFile(
    path,
    await readFile("fixtures/developer/knowledge/snapshot.json"),
  );
  const snapshot: KnowledgeSnapshot = await readKnowledgeSnapshot(path);

  expect(snapshot).toEqual(importKnowledge(await readFile(path, "utf8")));
  expect(snapshot.records[0]?.review.state).toBe("candidate");
});

it("accepts only canonical UTC timestamp strings", () => {
  for (const value of ["2026-11-11T00:00:00Z", "2028-02-29T23:59:59Z"])
    expect(isKnowledgeTimestamp(value)).toBe(true);
  for (const value of [
    null,
    1,
    "2026-02-30T00:00:00Z",
    "2026-11-11T00:00:00+00:00",
  ])
    expect(isKnowledgeTimestamp(value)).toBe(false);
});

it.each([
  ["missing", "missing.json"],
  ["directory", "."],
])("rejects a %s snapshot without reflecting its path", async (label, name) => {
  const root = await directory();
  const path = join(root, name);
  await expect(readKnowledgeSnapshot(path)).rejects.toThrow(
    "Knowledge snapshot is unavailable",
  );
  try {
    await readKnowledgeSnapshot(path);
  } catch (error) {
    expect(String(error)).not.toContain(root);
    if (label === "missing") expect(String(error)).not.toContain(name);
  }
});

it("rejects symlinks rather than following operator-selected links", async () => {
  const root = await directory();
  const source = join(root, "source.json");
  const linked = join(root, "linked.json");
  await writeFile(
    source,
    await readFile("fixtures/developer/knowledge/snapshot.json"),
  );
  await symlink(source, linked);

  await expect(readKnowledgeSnapshot(linked)).rejects.toThrow(
    "Knowledge snapshot is unavailable",
  );
});

it.each([
  ["oversized", Buffer.alloc(knowledgeSnapshotByteLimit + 1, 32)],
  ["non-UTF-8", Buffer.from([0xff])],
  ["invalid JSON", Buffer.from("{")],
])("rejects %s content with a stable error", async (_label, bytes) => {
  const root = await directory();
  const path = join(root, "snapshot.json");
  await writeFile(path, bytes);

  await expect(readKnowledgeSnapshot(path)).rejects.toThrow(
    "Knowledge snapshot is unavailable",
  );
});

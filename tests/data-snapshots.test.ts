import type { KnowledgeSnapshot } from "@arkcompat/contracts";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  exportKnowledge,
  importKnowledge,
} from "../packages/knowledge/src/index.js";

const script = resolve("scripts/verify-data-snapshots.mjs");
const roots: string[] = [];
const knowledge = "data/knowledge/curated-provenance-snapshot.json";
const rules = "data/rules/harmonyos-6.0-api20-rules.json";
const manifest = "data/snapshot-integrity.json";
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-data-gate-"));
  roots.push(root);
  await cp("data", join(root, "data"), { recursive: true });
  return root;
}
function run(root: string) {
  return spawnSync(process.execPath, [script, root], {
    encoding: "utf8",
    timeout: 10_000,
  });
}
type Pins = {
  entries: { path: string; sha256: string; canonicalSha256?: string }[];
};
type Rules = { generatedAt: string; rules: { id: string }[] };
async function mutate<T>(
  root: string,
  path: string,
  update: (data: T) => void,
  reseal = false,
) {
  const data = JSON.parse(await readFile(join(root, path), "utf8")) as T;
  update(data);
  const text = JSON.stringify(data, null, 2) + "\n";
  await writeFile(join(root, path), text);
  if (reseal) {
    const pins = JSON.parse(
      await readFile(join(root, manifest), "utf8"),
    ) as Pins;
    const entry = pins.entries.find(
      (item: { path: string }) => item.path === path,
    )!;
    entry.sha256 = digest(text);
    if (path === knowledge)
      entry.canonicalSha256 = digest(exportKnowledge(importKnowledge(text)));
    await writeFile(join(root, manifest), JSON.stringify(pins));
  }
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("checks both pinned snapshots and emits identical declared-metadata evidence", async () => {
  const root = await fixture();
  const first = run(root),
    second = run(root);
  expect({
    status: first.status,
    stable: first.stdout === second.stdout,
    summary: JSON.parse(first.stdout),
  }).toMatchObject({
    status: 0,
    stable: true,
    summary: {
      assessment: "declared-metadata-and-integrity-only",
      snapshots: 2,
      reviewedMappings: 0,
    },
  });
});
it("rejects changed snapshot bytes without a corresponding pin", async () => {
  const root = await fixture();
  await writeFile(
    join(root, knowledge),
    (await readFile(join(root, knowledge), "utf8")) + " ",
  );
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("digest mismatch"),
  });
});
it("rejects missing knowledge provenance even when its raw digest is resealed", async () => {
  const root = await fixture();
  await mutate<KnowledgeSnapshot>(root, knowledge, (d) => {
    d.records[0]!.provenance = [];
  });
  const pins = JSON.parse(await readFile(join(root, manifest), "utf8")) as Pins;
  pins.entries[0]!.sha256 = digest(
    await readFile(join(root, knowledge), "utf8"),
  );
  await writeFile(join(root, manifest), JSON.stringify(pins));
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("Invalid knowledge metadata"),
  });
});
it("rejects candidate promotion even with valid review fields and updated digests", async () => {
  const root = await fixture();
  await mutate<KnowledgeSnapshot>(
    root,
    knowledge,
    (d) => {
      d.records[0]!.review = {
        state: "reviewed",
        reviewer: "developer-fixture",
        reviewedAt: d.generatedAt,
      };
    },
    true,
  );
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("candidate-only"),
  });
});
it("rejects an incorrect canonical export digest", async () => {
  const root = await fixture();
  await mutate<Pins>(root, manifest, (d) => {
    d.entries[0]!.canonicalSha256 = "0".repeat(64);
  });
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("canonical export digest mismatch"),
  });
});
it("rejects invalid rule dates after resealing their raw digest", async () => {
  const root = await fixture();
  await mutate<Rules>(
    root,
    rules,
    (d) => {
      d.generatedAt = "2026-02-30T00:00:00Z";
    },
    true,
  );
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("rule timestamp"),
  });
});
it("rejects duplicate rule identities after resealing their raw digest", async () => {
  const root = await fixture();
  await mutate<Rules>(
    root,
    rules,
    (d) => {
      d.rules[1]!.id = d.rules[0]!.id;
    },
    true,
  );
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("duplicate rule ID"),
  });
});
it("rejects an unlisted data snapshot", async () => {
  const root = await fixture();
  await cp(join(root, knowledge), join(root, "data/knowledge/unlisted.json"));
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("inventory mismatch"),
  });
});
it("rejects unsafe manifest paths before reading outside the data inventory", async () => {
  const root = await fixture();
  await mutate<Pins>(root, manifest, (d) => {
    d.entries[0]!.path = "../private.json";
  });
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("Invalid snapshot inventory"),
  });
});
it("rejects a snapshot symlink", async () => {
  const root = await fixture();
  const copy = join(root, "outside.json");
  await cp(join(root, knowledge), copy);
  await unlink(join(root, knowledge));
  await symlink(copy, join(root, knowledge));
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("regular data file"),
  });
});

it("rejects a prepended BOM rather than silently normalizing pinned bytes", async () => {
  const root = await fixture();
  await writeFile(
    join(root, knowledge),
    "\ufeff" + (await readFile(join(root, knowledge), "utf8")),
  );
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("digest mismatch"),
  });
});
it("requires both rule and knowledge inventories even if files and pins are removed together", async () => {
  const root = await fixture();
  await unlink(join(root, rules));
  await mutate<Pins>(root, manifest, (d) => {
    d.entries.pop();
  });
  const result = run(root);
  expect({ status: result.status, error: result.stderr }).toMatchObject({
    status: 1,
    error: expect.stringContaining("Invalid snapshot inventory"),
  });
});

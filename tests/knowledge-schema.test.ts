import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, expect, it } from "vitest";
import { readFirstAvailableSchema } from "../packages/knowledge/src/schema-file.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function directory() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-knowledge-schema-"));
  roots.push(root);
  return root;
}

it("uses the fallback location when the primary schema is absent", async () => {
  const root = await directory();
  const fallback = join(root, "knowledge.schema.json");
  await writeFile(fallback, '{"title":"fallback"}\n');

  const content = readFirstAvailableSchema([
    pathToFileURL(join(root, "contracts", "knowledge.schema.json")),
    pathToFileURL(fallback),
  ]);

  expect(content).toBe('{"title":"fallback"}\n');
});

it("reads the primary schema when it exists", async () => {
  const root = await directory();
  const primary = join(root, "primary.json");
  await writeFile(primary, '{"title":"primary"}\n');
  await writeFile(join(root, "fallback.json"), '{"title":"fallback"}\n');

  expect(
    readFirstAvailableSchema([
      pathToFileURL(primary),
      pathToFileURL(join(root, "fallback.json")),
    ]),
  ).toBe('{"title":"primary"}\n');
});

it("does not bypass a non-ENOENT read error with a valid fallback", async () => {
  const root = await directory();
  const primary = join(root, "primary.json");
  await mkdir(primary);
  const fallback = join(root, "fallback.json");
  await writeFile(fallback, '{"title":"fallback"}\n');

  expect(() =>
    readFirstAvailableSchema([pathToFileURL(primary), pathToFileURL(fallback)]),
  ).toThrow(
    new RegExp(
      `Knowledge schema could not be read at ${primary.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      )} \\(EISDIR\\)`,
    ),
  );
});

it.runIf(process.platform !== "win32" && process.getuid?.() !== 0)(
  "preserves permission errors instead of selecting another schema",
  async () => {
    const root = await directory();
    const primary = join(root, "primary.json");
    await writeFile(primary, '{"title":"primary"}\n');
    await chmod(primary, 0o000);
    const fallback = join(root, "fallback.json");
    await writeFile(fallback, '{"title":"fallback"}\n');

    try {
      expect(() =>
        readFirstAvailableSchema([
          pathToFileURL(primary),
          pathToFileURL(fallback),
        ]),
      ).toThrow(/\(EACCES\)/);
    } finally {
      await chmod(primary, 0o600);
    }
  },
);

it("reports every checked location when no schema exists", async () => {
  const root = await directory();
  const candidates = [
    pathToFileURL(join(root, "contracts", "knowledge.schema.json")),
    pathToFileURL(join(root, "knowledge.schema.json")),
  ];

  expect(() => readFirstAvailableSchema(candidates)).toThrow(
    `Knowledge schema is unavailable; checked: ${root}/contracts/knowledge.schema.json, ${root}/knowledge.schema.json`,
  );
});

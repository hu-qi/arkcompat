import { spawnSync } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterEach, expect, it } from "vitest";

const script = "scripts/deterministic-tar.mjs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-tar-"));
  roots.push(root);
  return root;
}

function build(directory: string, outFile: string, timeZone = "UTC") {
  return spawnSync(process.execPath, [script, directory, outFile], {
    encoding: "utf8",
    env: { ...process.env, TZ: timeZone },
  });
}

interface Entry {
  name: string;
  mode: number;
  uid: number;
  gid: number;
  mtime: number;
  type: string;
  uname: string;
  gname: string;
  data: Buffer;
}

function readEntries(archive: Buffer): Entry[] {
  const tar = gunzipSync(archive);
  const entries: Entry[] = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const text = (start: number, length: number) =>
      header
        .subarray(start, start + length)
        .toString("utf8")
        .replace(/\0.*$/s, "");
    const octal = (start: number, length: number) =>
      Number.parseInt(text(start, length), 8);
    const prefix = text(345, 155);
    const name = text(0, 100);
    const size = octal(124, 12);
    entries.push({
      name: prefix ? `${prefix}/${name}` : name,
      mode: octal(100, 8),
      uid: octal(108, 8),
      gid: octal(116, 8),
      mtime: octal(136, 12),
      type: text(156, 1),
      uname: text(265, 32),
      gname: text(297, 32),
      data: tar.subarray(offset + 512, offset + 512 + size),
    });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

async function fixture() {
  const root = await workspace();
  const tree = join(root, "tree");
  const long = `${"nested/"}${"d".repeat(70)}/${"f".repeat(70)}.txt`;
  await mkdir(join(tree, "nested", "deep"), { recursive: true });
  await mkdir(join(tree, "nested", "d".repeat(70)));
  await writeFile(join(tree, "a.txt"), "alpha\n");
  await writeFile(join(tree, "nested", "deep", "c.txt"), "charlie\n");
  await writeFile(join(tree, long), "long\n");
  await chmod(join(tree, "a.txt"), 0o700);
  await utimes(join(tree, "a.txt"), new Date(), new Date());
  return { root, tree, long };
}

it("writes byte-identical archives for the same tree regardless of TZ", async () => {
  const { root, tree } = await fixture();
  const first = join(root, "first.tar.gz");
  const second = join(root, "second.tar.gz");
  expect(build(tree, first, "UTC").status).toBe(0);
  expect(build(tree, second, "Asia/Tokyo").status).toBe(0);

  const firstBytes = await readFile(first);
  const secondBytes = await readFile(second);
  expect(firstBytes.equals(secondBytes)).toBe(true);
  // RFC 1952 gzip MTIME must be zero, not the build time.
  expect(firstBytes.subarray(4, 8).readUInt32LE(0)).toBe(0);
});

it("normalizes ownership, modes, timestamps and entry order", async () => {
  const { root, tree, long } = await fixture();
  const archive = join(root, "normalized.tar.gz");
  expect(build(tree, archive).status).toBe(0);
  const entries = readEntries(await readFile(archive));

  expect(entries.map((entry) => entry.name)).toEqual(
    [...entries.map((entry) => entry.name)].sort(),
  );
  for (const entry of entries) {
    expect({
      uid: entry.uid,
      gid: entry.gid,
      uname: entry.uname,
      gname: entry.gname,
      mtime: entry.mtime,
      type: entry.type,
      mode: entry.mode,
    }).toEqual({
      uid: 0,
      gid: 0,
      uname: "root",
      gname: "root",
      mtime: 315532800,
      type: entry.name.endsWith("/") ? "5" : "0",
      mode: entry.name.endsWith("/") ? 0o755 : 0o644,
    });
    expect(entry.name.startsWith("/")).toBe(false);
    expect(entry.name.split("/")).not.toContain("..");
  }
  expect(entries).toContainEqual(
    expect.objectContaining({ name: `${long}`, data: Buffer.from("long\n") }),
  );
  expect(entries.map((entry) => entry.name)).toContain("nested/");
});

it("produces an archive the system tar can extract", async () => {
  const { root, tree } = await fixture();
  const archive = join(root, "extract.tar.gz");
  const destination = join(root, "extracted");
  await mkdir(destination);
  expect(build(tree, archive).status).toBe(0);
  const extraction = spawnSync("tar", ["-xzf", archive, "-C", destination], {
    encoding: "utf8",
  });
  expect(extraction.status, extraction.stderr).toBe(0);
  expect(await readFile(join(destination, "a.txt"), "utf8")).toBe("alpha\n");
  expect(
    await readFile(join(destination, "nested", "deep", "c.txt"), "utf8"),
  ).toBe("charlie\n");
});

it("rejects symlinks instead of archiving them", async () => {
  const { root, tree } = await fixture();
  await symlink("a.txt", join(tree, "link.txt"));
  const result = build(tree, join(root, "rejected.tar.gz"));
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "Unsupported archive entry (not a regular file or directory): link.txt",
  );
  expect((await lstat(join(tree, "link.txt"))).isSymbolicLink()).toBe(true);
});

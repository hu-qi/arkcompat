import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * Fixed archive metadata. The timestamp is 1980-01-01T00:00:00Z, expressed as
 * a UTC epoch so the bytes do not depend on the host time zone.
 */
const fixedMtime = 315532800;
const directoryMode = 0o755;
const fileMode = 0o644;
const blockSize = 512;

function ustarString(value, width) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length > width) throw new Error(`ustar field too long: ${value}`);
  return bytes;
}

function octal(value, width) {
  const text = value.toString(8);
  if (text.length > width - 1)
    throw new Error(`ustar number too large: ${value}`);
  return Buffer.from(text.padStart(width - 1, "0") + "\0", "ascii");
}

function splitName(name) {
  if (Buffer.byteLength(name) <= 100) return { name, prefix: "" };
  for (let index = name.length - 1; index > 0; index--) {
    if (name[index] !== "/") continue;
    const prefix = name.slice(0, index);
    const rest = name.slice(index + 1);
    if (
      rest.length > 0 &&
      Buffer.byteLength(rest) <= 100 &&
      Buffer.byteLength(prefix) <= 155
    )
      return { name: rest, prefix };
  }
  throw new Error(`ustar path is too long to encode: ${name}`);
}

function header({ path, type, mode, size }) {
  const written = type === "5" ? `${path}/` : path;
  const { name, prefix } = splitName(written);
  const block = Buffer.alloc(blockSize, 0);
  ustarString(name, 100).copy(block, 0);
  octal(mode, 8).copy(block, 100);
  octal(0, 8).copy(block, 108); // uid
  octal(0, 8).copy(block, 116); // gid
  octal(size, 12).copy(block, 124);
  octal(fixedMtime, 12).copy(block, 136);
  block.fill(0x20, 148, 156); // checksum placeholder
  block.write(type, 156, "ascii");
  ustarString("root", 32).copy(block, 265); // uname
  ustarString("root", 32).copy(block, 297); // gname
  block.write("ustar\0", 257, "ascii");
  block.write("00", 263, "ascii");
  ustarString(prefix, 155).copy(block, 345);
  let checksum = 0;
  for (const byte of block) checksum += byte;
  block.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  return block;
}

function collect(directory) {
  const entries = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const absolute = join(current, name);
      const path = relative(directory, absolute).split(sep).join("/");
      const stat = lstatSync(absolute);
      if (stat.isDirectory()) {
        entries.push({ path, type: "5", mode: directoryMode });
        walk(absolute);
      } else if (stat.isFile()) {
        entries.push({
          path,
          type: "0",
          mode: fileMode,
          data: readFileSync(absolute),
        });
      } else {
        throw new Error(
          `Unsupported archive entry (not a regular file or directory): ${path}`,
        );
      }
    }
  };
  walk(directory);
  return entries.sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.path, "utf8"),
      Buffer.from(right.path, "utf8"),
    ),
  );
}

/**
 * Build a gzip-compressed ustar archive with fixed mtimes/ownership/modes,
 * sorted entry order and a gzip header without a timestamp. Written in Node so
 * GNU tar and BSD tar runners produce the same bytes for the same tree; this
 * deliberately avoids GNU-only flags such as --uid/--gid/--uname/--gname.
 */
export function buildDeterministicTar(directory) {
  const chunks = [];
  for (const entry of collect(directory)) {
    const data = entry.data ?? Buffer.alloc(0);
    chunks.push(header({ ...entry, size: data.length }));
    if (entry.type === "0") {
      chunks.push(data);
      const padding = (blockSize - (data.length % blockSize)) % blockSize;
      if (padding) chunks.push(Buffer.alloc(padding, 0));
    }
  }
  chunks.push(Buffer.alloc(blockSize * 2, 0));
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}

export function writeDeterministicTar(directory, outFile) {
  writeFileSync(outFile, buildDeterministicTar(directory));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [directory, outFile, ...extra] = process.argv.slice(2);
  if (!directory || !outFile || extra.length) {
    console.error(
      "Usage: node scripts/deterministic-tar.mjs <directory> <new-file.tar.gz>",
    );
    process.exitCode = 2;
  } else {
    try {
      writeDeterministicTar(directory, outFile);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

import { execFileSync } from "node:child_process";
import {
  constants,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const [vsce, target, ...extra] = process.argv.slice(2);
const vsceVersion = "4.1.0";

/**
 * vsce stamps generated manifest files with the current time and emits ZIP
 * entries in filesystem order. Rewrite the archive with sorted entries and
 * fixed 1980-01-01 DOS timestamps so unchanged content yields identical bytes.
 */
function normalizeZip(path) {
  const buffer = readFileSync(path);
  let end = -1;
  for (let index = buffer.length - 22; index >= 0; index--) {
    if (
      buffer.readUInt32LE(index) === 0x06054b50 &&
      index + 22 + buffer.readUInt16LE(index + 20) === buffer.length
    ) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("VSIX end-of-central-directory not found.");
  const archiveComment = Buffer.from(
    buffer.subarray(end + 22, end + 22 + buffer.readUInt16LE(end + 20)),
  );
  const entryCount = buffer.readUInt16LE(end + 10);
  const centralSize = buffer.readUInt32LE(end + 12);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = [];
  for (let entry = 0; entry < entryCount; entry++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("VSIX central directory is malformed.");
    const flags = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = Buffer.from(
      buffer.subarray(offset + 46, offset + 46 + nameLength),
    );
    const central = Buffer.from(
      buffer.subarray(
        offset,
        offset + 46 + nameLength + extraLength + commentLength,
      ),
    );
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50)
      throw new Error("VSIX local header is malformed.");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    let descriptorLength = 0;
    if (flags & 0x0008) {
      descriptorLength =
        buffer.readUInt32LE(dataStart + compressedSize) === 0x08074b50
          ? 16
          : 12;
    }
    entries.push({
      name,
      central,
      local: Buffer.from(
        buffer.subarray(
          localOffset,
          dataStart + compressedSize + descriptorLength,
        ),
      ),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== buffer.readUInt32LE(end + 16) + centralSize)
    throw new Error("VSIX central directory size is inconsistent.");

  entries.sort((left, right) => Buffer.compare(left.name, right.name));
  const chunks = [];
  const centralChunks = [];
  let localOffset = 0;
  let centralLength = 0;
  for (const entry of entries) {
    const local = entry.local;
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    const central = entry.central;
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(localOffset, 42);
    chunks.push(local);
    localOffset += local.length;
    centralChunks.push(central);
    centralLength += central.length;
  }
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralLength, 12);
  endRecord.writeUInt32LE(localOffset, 16);
  endRecord.writeUInt16LE(archiveComment.length, 20);
  writeFileSync(
    path,
    Buffer.concat([...chunks, ...centralChunks, endRecord, archiveComment]),
  );
}

function packageExtension() {
  if (
    !vsce ||
    !isAbsolute(vsce) ||
    !target ||
    extname(target) !== ".vsix" ||
    extra.length
  )
    throw new Error(
      "Usage: pnpm package:vscode <absolute-vsce-path> <new-file.vsix>",
    );
  const installedVersion = execFileSync(vsce, ["--version"], {
    encoding: "utf8",
  }).trim();
  if (installedVersion !== vsceVersion)
    throw new Error(`Use VS Code Extension Manager ${vsceVersion}.`);

  const temp = mkdtempSync(join(tmpdir(), "arkcompat-vsix-"));
  try {
    const stage = join(temp, "extension");
    mkdirSync(join(stage, "dist"), { recursive: true });
    execFileSync("pnpm", ["exec", "tsc", "-b", "apps/vscode/tsconfig.json"], {
      cwd: root,
      stdio: "inherit",
    });
    execFileSync(
      process.execPath,
      ["scripts/package-cli.mjs", join(stage, "runtime")],
      { cwd: root, stdio: "inherit" },
    );
    const extension = join(root, "apps", "vscode");
    for (const path of [
      "package.json",
      "README.md",
      "dist/extension.cjs",
      "dist/runner.cjs",
    ])
      copyFileSync(join(extension, path), join(stage, path));
    copyFileSync(join(root, "LICENSE"), join(stage, "LICENSE"));
    // Normalize timestamps so an unchanged source tree yields byte-identical
    // ZIP entries across builds.
    execFileSync("find", [
      stage,
      "-type",
      "f",
      "-exec",
      "touch",
      "-t",
      "198001010000",
      "{}",
      "+",
    ]);
    execFileSync("find", [
      stage,
      "-type",
      "d",
      "-exec",
      "touch",
      "-t",
      "198001010000",
      "{}",
      "+",
    ]);
    const packaged = join(temp, "arkcompat-local.vsix");
    execFileSync(vsce, ["package", "--no-dependencies", "--out", packaged], {
      cwd: stage,
      stdio: "inherit",
    });
    normalizeZip(packaged);
    copyFileSync(packaged, resolve(target), constants.COPYFILE_EXCL);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  packageExtension();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

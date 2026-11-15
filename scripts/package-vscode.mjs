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
 * vsce stamps generated manifest files with the current time. Rewrite the DOS
 * timestamp fields in both ZIP headers to 1980-01-01 so unchanged content
 * yields byte-identical VSIX files.
 */
function normalizeZipTimestamps(path) {
  const buffer = readFileSync(path);
  let end = -1;
  for (let index = buffer.length - 22; index >= 0; index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end < 0) throw new Error("VSIX end-of-central-directory not found.");
  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  for (let entry = 0; entry < entries; entry++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("VSIX central directory is malformed.");
    const local = buffer.readUInt32LE(offset + 42);
    if (buffer.readUInt32LE(local) !== 0x04034b50)
      throw new Error("VSIX local header is malformed.");
    buffer.writeUInt16LE(0, offset + 12);
    buffer.writeUInt16LE(0x21, offset + 14);
    buffer.writeUInt16LE(0, local + 10);
    buffer.writeUInt16LE(0x21, local + 12);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  writeFileSync(path, buffer);
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
    normalizeZipTimestamps(packaged);
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

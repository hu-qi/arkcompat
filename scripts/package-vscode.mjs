import { execFileSync } from "node:child_process";
import {
  constants,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const [vsce, target, ...extra] = process.argv.slice(2);
const vsceVersion = "4.1.0";

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
    const packaged = join(temp, "arkcompat-local.vsix");
    execFileSync(vsce, ["package", "--no-dependencies", "--out", packaged], {
      cwd: stage,
      stdio: "inherit",
    });
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

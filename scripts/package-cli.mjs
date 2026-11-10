import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const [target, ...extra] = process.argv.slice(2);

function packageCli() {
  if (!target || extra.length)
    throw new Error(
      "Usage: pnpm package:cli <new-directory-outside-workspace>",
    );
  const requested = resolve(target);
  const output = join(realpathSync(dirname(requested)), basename(requested));
  const toOutput = relative(root, output);
  if (
    !isAbsolute(toOutput) &&
    toOutput !== ".." &&
    !toOutput.startsWith(`..${sep}`)
  ) {
    throw new Error("Output directory must be outside the workspace.");
  }
  try {
    mkdirSync(output);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error("Output directory already exists.");
    throw error;
  }
  let temporary;
  try {
    const pnpm = (args) =>
      execFileSync("pnpm", args, { cwd: root, stdio: "inherit" });
    pnpm(["exec", "tsc", "-b", "apps/cli/tsconfig.json"]);
    temporary = mkdtempSync(join(tmpdir(), "arkcompat-cli-deploy-"));
    const stage = join(temporary, "runtime");
    pnpm([
      "--filter",
      "@arkcompat/cli",
      "--prod",
      "deploy",
      "--config.inject-workspace-packages=true",
      "--config.node-linker=hoisted",
      "--config.package-import-method=copy",
      "--offline",
      "--ignore-scripts",
      stage,
    ]);

    // Generated install metadata and command shims can contain build-host paths.
    const dependencies = join(stage, "node_modules");
    for (const name of [
      ".bin",
      ".modules.yaml",
      ".pnpm",
      ".pnpm-workspace-state-v1.json",
    ]) {
      rmSync(join(dependencies, name), { recursive: true, force: true });
    }
    const runtimePaths = [join(stage, "dist"), dependencies];
    for (const dir of runtimePaths) {
      const entries = readdirSync(dir, {
        withFileTypes: true,
        recursive: true,
      });
      if (entries.some((entry) => !entry.isFile() && !entry.isDirectory())) {
        throw new Error("Portable CLI contains a symlink or special file.");
      }
    }
    for (const dir of runtimePaths) {
      cpSync(dir, join(output, relative(stage, dir)), { recursive: true });
    }
    cpSync(join(root, "LICENSE"), join(output, "LICENSE"));
    const { name, version, type, bin } = JSON.parse(
      readFileSync(join(root, "apps/cli/package.json"), "utf8"),
    );
    const { license, engines } = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    writeFileSync(
      join(output, "package.json"),
      JSON.stringify(
        { name, version, private: true, type, bin, license, engines },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "Portable CLI staged; run node dist/index.js --help from the output directory.",
    );
  } catch (error) {
    rmSync(output, { recursive: true, force: true });
    throw error;
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}

try {
  packageCli();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const [target, ...extra] = process.argv.slice(2);

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function ensureVsce() {
  if (process.env.VSCE_PATH && existsSync(process.env.VSCE_PATH)) {
    return process.env.VSCE_PATH;
  }
  const standard = "/private/tmp/arkcompat-tools/node_modules/.bin/vsce";
  if (existsSync(standard)) return standard;

  const tempTools = mkdtempSync(join(tmpdir(), "arkcompat-tools-"));
  execFileSync(
    "npm",
    [
      "install",
      "--prefix",
      tempTools,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      "@vscode/vsce@4.1.0",
    ],
    { stdio: "inherit" },
  );
  return join(tempTools, "node_modules/.bin/vsce");
}

function packageRelease() {
  if (!target || extra.length) {
    throw new Error(
      "Usage: node scripts/package-release.mjs <new-output-directory>",
    );
  }
  const requested = resolve(target);
  const outDir = join(realpathSync(dirname(requested)), basename(requested));
  if (existsSync(outDir)) {
    throw new Error(`Output directory already exists: ${outDir}`);
  }
  mkdirSync(outDir, { recursive: true, mode: 0o755 });

  console.log(`Building ArkCompat release artifacts into: ${outDir}\n`);

  // 1. Source kit archive
  console.log("==> 1. Generating source kit (arkcompat-source.tar.gz)...");
  const sourceTar = join(outDir, "arkcompat-source.tar.gz");
  const gitArchive = execFileSync(
    "git",
    ["archive", "--format=tar", "--prefix=arkcompat/", "HEAD"],
    { cwd: root, maxBuffer: 32 * 1024 * 1024 },
  );
  const gzipOut = execFileSync("gzip", ["-n", "-9"], {
    input: gitArchive,
    maxBuffer: 32 * 1024 * 1024,
  });
  writeFileSync(sourceTar, gzipOut);
  console.log(`    Generated: ${sourceTar}`);

  // 2. Portable CLI runtime package
  console.log(
    "\n==> 2. Generating portable CLI (arkcompat-cli-portable.tar.gz)...",
  );
  const cliStage = mkdtempSync(join(tmpdir(), "arkcompat-cli-stage-"));
  try {
    const cliDeploy = join(cliStage, "cli");
    execFileSync(
      process.execPath,
      [join(root, "scripts/package-cli.mjs"), cliDeploy],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    execFileSync(
      process.execPath,
      [join(root, "scripts/validate-runtime-provenance.mjs"), cliDeploy],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    const cliTar = join(outDir, "arkcompat-cli-portable.tar.gz");
    execFileSync("tar", ["-czf", cliTar, "-C", cliDeploy, "."], {
      stdio: "inherit",
    });
    // Copy SBOM and notices to release root as standalone review artifacts
    copyFileSync(
      join(cliDeploy, "SBOM.cdx.json"),
      join(outDir, "SBOM.cdx.json"),
    );
    copyFileSync(
      join(cliDeploy, "THIRD-PARTY-NOTICES.json"),
      join(outDir, "THIRD-PARTY-NOTICES.json"),
    );
    console.log(`    Generated: ${cliTar}`);
  } finally {
    rmSync(cliStage, { recursive: true, force: true });
  }

  // 3. VS Code / Cursor extension (VSIX)
  console.log(
    "\n==> 3. Generating VS Code / Cursor extension (arkcompat-vscode.vsix)...",
  );
  const vsceBin = ensureVsce();
  const vsixOut = join(outDir, "arkcompat-vscode.vsix");
  execFileSync(
    process.execPath,
    [join(root, "scripts/package-vscode.mjs"), vsceBin, vsixOut],
    { cwd: root, stdio: "inherit" },
  );
  console.log(`    Generated: ${vsixOut}`);

  // 4. DevEco Studio plugin (ZIP)
  const devecoApp = process.env.DEVECO_APP ?? "/Applications/DevEco-Studio.app";
  if (
    process.platform === "darwin" &&
    process.arch === "arm64" &&
    existsSync(devecoApp)
  ) {
    console.log(
      "\n==> 4. Generating DevEco Studio plugin (arkcompat-deveco.zip)...",
    );
    const devecoStage = mkdtempSync(join(tmpdir(), "arkcompat-deveco-stage-"));
    try {
      const devecoTarget = join(devecoStage, "deveco");
      execFileSync(
        process.execPath,
        [join(root, "scripts/package-deveco.mjs"), devecoApp, devecoTarget],
        { cwd: root, stdio: "inherit" },
      );
      copyFileSync(
        join(devecoTarget, "arkcompat-deveco.zip"),
        join(outDir, "arkcompat-deveco.zip"),
      );
      console.log(`    Generated: ${join(outDir, "arkcompat-deveco.zip")}`);
    } finally {
      rmSync(devecoStage, { recursive: true, force: true });
    }
  } else {
    console.log(
      "\n==> 4. Skipping DevEco Studio packaging (requires macOS arm64 with DevEco-Studio.app).",
    );
  }

  // 5. Local Web Report Viewer
  console.log(
    "\n==> 5. Generating Web Report Viewer (arkcompat-web.tar.gz)...",
  );
  execFileSync("pnpm", ["--filter", "@arkcompat/web", "build"], {
    cwd: root,
    stdio: "inherit",
  });
  const webStage = mkdtempSync(join(tmpdir(), "arkcompat-web-stage-"));
  try {
    const webDir = join(webStage, "arkcompat-web");
    mkdirSync(webDir, { recursive: true });
    const webApp = join(root, "apps/web");
    execFileSync("cp", ["-R", join(webApp, "dist"), webDir]);
    for (const f of ["server.mjs", "package.json", "README.md"]) {
      if (existsSync(join(webApp, f)))
        copyFileSync(join(webApp, f), join(webDir, f));
    }
    copyFileSync(join(root, "LICENSE"), join(webDir, "LICENSE"));
    const webTar = join(outDir, "arkcompat-web.tar.gz");
    execFileSync("tar", ["-czf", webTar, "-C", webStage, "arkcompat-web"], {
      stdio: "inherit",
    });
    console.log(`    Generated: ${webTar}`);
  } finally {
    rmSync(webStage, { recursive: true, force: true });
  }

  // 6. Checksums (SHA256SUMS)
  console.log("\n==> 6. Generating checksums (SHA256SUMS)...");
  const files = readdirSync(outDir)
    .filter((f) => f !== "SHA256SUMS")
    .sort();
  const lines = files.map((f) => `${sha256File(join(outDir, f))}  ${f}`);
  writeFileSync(join(outDir, "SHA256SUMS"), lines.join("\n") + "\n");

  console.log("\n================ Release Manifest ================");
  for (const line of lines) {
    console.log(line);
  }
  console.log("==================================================\n");
  console.log("Release package build complete successfully!");
}

try {
  packageRelease();
} catch (error) {
  console.error("Release packaging failed:", error);
  process.exitCode = 1;
}

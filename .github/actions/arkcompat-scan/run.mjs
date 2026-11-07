import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  lstatSync,
  mkdtempSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

class ActionError extends Error {}
const pathError = "project must be a relative directory inside the workspace.";
function projectDirectory(workspace, project) {
  try {
    if (
      !project ||
      project.length > 1024 ||
      isAbsolute(project) ||
      /[\\:\u0000-\u001f\u007f]/.test(project)
    )
      throw new Error();
    const root = realpathSync(workspace);
    let candidate = root;
    for (const component of project === "." ? [] : project.split("/")) {
      if (!component || component === "." || component === "..")
        throw new Error();
      candidate = join(candidate, component);
      if (lstatSync(candidate).isSymbolicLink()) throw new Error();
    }
    const path = realpathSync(candidate);
    const rel = relative(root, path);
    if (
      rel === ".." ||
      rel.startsWith(`..${sep}`) ||
      isAbsolute(rel) ||
      !statSync(path).isDirectory()
    )
      throw new Error();
    return path;
  } catch {
    throw new ActionError(pathError);
  }
}

try {
  const {
    GITHUB_WORKSPACE: workspace,
    GITHUB_OUTPUT: output,
    RUNNER_TEMP: temp,
    ARKCOMPAT_SCAN_PROJECT: project,
    ARKCOMPAT_SCAN_RUNTIME: runtime,
    ARKCOMPAT_SCAN_RELEASE: release,
    ARKCOMPAT_SCAN_API_LEVEL: apiLevel,
  } = process.env;
  if (!workspace || !output || !temp)
    throw new ActionError("missing GitHub Actions runner context.");
  if (!runtime || !release)
    throw new ActionError("runtime and release inputs are required.");
  const cli = fileURLToPath(
    new URL("../../../apps/cli/dist/index.js", import.meta.url),
  );
  const path = projectDirectory(workspace, project);
  const args = [cli, "scan", path, "--runtime", runtime, "--release", release];
  if (apiLevel) args.push("--api-level", apiLevel);
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
    killSignal: "SIGKILL",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || result.error)
    throw new ActionError(
      "scan failed; check target, project inputs and scan limits locally.",
    );
  const report = JSON.parse(result.stdout);
  if (
    report.snapshots?.rules !== "none" ||
    report.snapshots?.knowledge !== "none"
  )
    throw new ActionError("unexpected rules or knowledge snapshot.");
  const directory = mkdtempSync(join(realpathSync(temp), "arkcompat-scan-"));
  const reportPath = join(directory, "report.json");
  if (/[\r\n]/.test(reportPath))
    throw new ActionError("invalid runner output path.");
  writeFileSync(reportPath, result.stdout, { flag: "wx", mode: 0o600 });
  appendFileSync(output, `report-path=${reportPath}\n`, { flag: "a" });
} catch (error) {
  console.error(
    `ArkCompat: ${error instanceof ActionError ? error.message : "could not create the canonical runner report."}`,
  );
  process.exitCode = 1;
}

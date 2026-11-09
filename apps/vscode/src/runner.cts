import { execFile } from "node:child_process";
import { dirname, isAbsolute } from "node:path";
import { promisify } from "node:util";
import type {
  ScanReport,
  SourceLocation,
  TargetProfile,
} from "@arkcompat/contracts";
const exec = promisify(execFile);

export function editorLocation(location: SourceLocation) {
  const parts = location.path.split("/");
  if (
    isAbsolute(location.path) ||
    /[\\:\u0000-\u001f\u007f]/.test(location.path) ||
    parts.some((part) => !part || part === "." || part === "..") ||
    !Number.isSafeInteger(location.line) ||
    location.line < 1 ||
    !Number.isSafeInteger(location.column) ||
    location.column < 1
  )
    throw new Error("Invalid scanner location.");
  return { parts, line: location.line - 1, column: location.column - 1 };
}

export async function scanWithCli(
  node: string,
  cli: string,
  project: string,
  target: TargetProfile,
  signal?: AbortSignal,
): Promise<ScanReport> {
  if (!isAbsolute(node))
    throw new Error("Configure an absolute Node executable path.");
  try {
    const args = [
      cli,
      "scan",
      project,
      "--runtime",
      target.runtime,
      "--release",
      target.release,
    ];
    if (target.apiLevel !== undefined)
      args.push("--api-level", String(target.apiLevel));
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.NODE_PATH;
    delete env.NODE_CHANNEL_FD;
    const { stdout } = await exec(node, args, {
      cwd: dirname(cli),
      env,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024,
      killSignal: "SIGKILL",
      ...(signal ? { signal } : {}),
    });
    const report = JSON.parse(stdout) as ScanReport;
    if (
      report?.schemaVersion !== "0.8.0" ||
      report.snapshots?.rules !== "none" ||
      report.snapshots?.knowledge !== "none" ||
      !Array.isArray(report.findings) ||
      report.findings.some(
        (finding) =>
          finding.status !== "unknown" || !/^[a-f0-9]{64}$/.test(finding.id),
      )
    )
      throw new Error();
    return report;
  } catch {
    throw new Error(
      "Local scanner failed; check the target, inputs and scan limits.",
    );
  }
}

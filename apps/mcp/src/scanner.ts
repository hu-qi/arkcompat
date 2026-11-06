import { lstat, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { Worker } from "node:worker_threads";
import type { ScanReport, TargetProfile } from "@arkcompat/contracts";

const pathError =
  "Project must be a relative directory within the configured workspace.";
interface Limits {
  timeoutMs?: number;
  maxReportBytes?: number;
}

/** Local operator grants access, never a model-supplied tool argument. */
export class WorkspaceScanner {
  private busy = false;
  private report: ScanReport | undefined;
  private constructor(
    private root: string,
    private granted: boolean,
    private limits: Limits,
  ) {}

  static async create(root: string, granted: boolean, limits: Limits = {}) {
    try {
      const resolved = await realpath(root);
      if (!(await stat(resolved)).isDirectory()) throw new Error();
      return new WorkspaceScanner(resolved, granted, limits);
    } catch {
      throw new Error("Configured workspace is unavailable.");
    }
  }

  private async projectPath(project: string) {
    if (
      project !== "." &&
      (!project ||
        isAbsolute(project) ||
        /[\\:\u0000-\u001f\u007f]/.test(project) ||
        project
          .split("/")
          .some((part) => !part || part === "." || part === ".."))
    )
      throw new Error(pathError);
    try {
      let path = this.root;
      for (const part of project === "." ? [] : project.split("/")) {
        path = join(path, part);
        if ((await lstat(path)).isSymbolicLink()) throw new Error();
      }
      const resolved = await realpath(path);
      const rel = relative(this.root, resolved);
      if (
        isAbsolute(rel) ||
        rel === ".." ||
        rel.startsWith(`..${sep}`) ||
        !(await stat(resolved)).isDirectory()
      )
        throw new Error();
      return resolved;
    } catch {
      throw new Error(pathError);
    }
  }

  async scan(
    project: string,
    target: TargetProfile,
    signal?: AbortSignal,
  ): Promise<ScanReport> {
    if (this.busy) throw new Error("A scan is already running.");
    this.busy = true;
    this.report = undefined;
    try {
      if (!this.granted)
        throw new Error(
          "Report access is disabled; the operator must enable --allow-report-access.",
        );
      const path = await this.projectPath(project);
      if (signal?.aborted) throw new Error("Scan cancelled.");
      const report = await new Promise<ScanReport>((resolve, reject) => {
        const worker = new Worker(
          new URL("../dist/worker.js", import.meta.url),
          {
            workerData: {
              path,
              target,
              maxReportBytes: this.limits.maxReportBytes ?? 2 * 1024 * 1024,
            },
            resourceLimits: {
              maxOldGenerationSizeMb: 256,
              maxYoungGenerationSizeMb: 32,
            },
            stdout: true,
            stderr: true,
          },
        );
        let settled = false;
        const finish = (error?: string, result?: ScanReport) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener("abort", cancel);
          // Keep busy until termination: no overlapping worker on timeout/cancel.
          void worker.terminate().then(
            () => {
              if (error) reject(new Error(error));
              else resolve(result!);
            },
            () => reject(new Error("Scan worker termination failed.")),
          );
        };
        const cancel = () => finish("Scan cancelled.");
        const timer = setTimeout(
          () => finish("Scan time limit exceeded."),
          this.limits.timeoutMs ?? 30000,
        );
        signal?.addEventListener("abort", cancel, { once: true });
        worker.once(
          "message",
          (message: { report?: ScanReport; error?: string }) =>
            finish(message.error, message.report),
        );
        worker.once("error", () =>
          finish("Scan worker failed; input may exceed resource limits."),
        );
        worker.once("exit", () =>
          finish("Scan worker stopped without a report."),
        );
        // The core never logs. Discard unexpected worker output so no source/error
        // payload can contaminate the protocol channel or operator logs.
        worker.stdout.resume();
        worker.stderr.resume();
      });
      this.report = report;
      return report;
    } finally {
      this.busy = false;
    }
  }

  explain(findingId: string) {
    const finding = this.report?.findings.find((item) => item.id === findingId);
    if (!finding || !this.report)
      throw new Error("Finding is unavailable; scan this workspace first.");
    return {
      finding,
      snapshots: this.report.snapshots,
      coverage: this.report.coverage,
    };
  }
}

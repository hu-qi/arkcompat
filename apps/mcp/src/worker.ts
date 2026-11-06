import { parentPort, workerData } from "node:worker_threads";
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";

const { path, target, maxReportBytes } = workerData as {
  path: string;
  target: TargetProfile;
  maxReportBytes: number;
};
try {
  const report = await scanProject(path, target);
  if (Buffer.byteLength(JSON.stringify(report), "utf8") > maxReportBytes) {
    parentPort!.postMessage({ error: "Report size limit exceeded." });
  } else parentPort!.postMessage({ report });
} catch {
  // Core/filesystem/parser errors may contain source paths or package payloads.
  parentPort!.postMessage({
    error:
      "Scan failed; check project inputs and documented scan limits locally.",
  });
}

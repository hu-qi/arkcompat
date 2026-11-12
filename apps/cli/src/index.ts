#!/usr/bin/env node
import {
  apiRuleSnapshotByteLimit,
  assessReport,
  evaluateApiRules,
  explainFinding,
  formatAssessmentReport,
  formatReport,
  scanProject,
} from "@arkcompat/core";
import type { AssessmentReportFormat, ReportFormat } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";

import { readLocalUtf8 } from "./local-input.js";

const usage =
  "Usage: arkcompat scan <project> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>] [--timeout-ms <milliseconds>] [--format <json|markdown|sarif>]\n       arkcompat api-rules <project> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>] --rules <snapshot.json>\n       arkcompat explain <project> --finding-id <sha256> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>]\n       arkcompat knowledge-export <snapshot.json>\n       arkcompat ohpm-evidence <capture.json> <package> <version> <observed-at-utc>";
const assessUsage =
  "       arkcompat assess <project> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>] [--rules <snapshot.json>] [--knowledge <snapshot.json> --as-of <utc>] [--format <json|markdown>]";
const fullUsage = `${usage}\n${assessUsage}`;
async function main(args: string[]) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(fullUsage);
    return;
  }
  if (args[0] === "ohpm-evidence") {
    const [, path, name, version, observedAt] = args;
    if (
      args.length !== 5 ||
      !path ||
      path.startsWith("--") ||
      !name ||
      !version ||
      !observedAt
    )
      throw new Error(fullUsage);
    const { inspectOhpmCapture, ohpmCaptureByteLimit } =
      await import("@arkcompat/knowledge");
    const text = await readLocalUtf8(
      path,
      ohpmCaptureByteLimit,
      "OHPM metadata capture",
    );
    console.log(
      JSON.stringify(
        inspectOhpmCapture(text, name, version, observedAt),
        null,
        2,
      ),
    );
    return;
  }
  if (args[0] === "knowledge-export") {
    const path = args[1];
    if (args.length !== 2 || !path || path.startsWith("--"))
      throw new Error(fullUsage);
    const { knowledgeSnapshotByteLimit, importKnowledge, exportKnowledge } =
      await import("@arkcompat/knowledge");
    const text = await readLocalUtf8(
      path,
      knowledgeSnapshotByteLimit,
      "knowledge snapshot",
    );
    process.stdout.write(exportKnowledge(importKnowledge(text)));
    return;
  }
  const [command, project, ...flags] = args;
  if (
    (command !== "scan" &&
      command !== "api-rules" &&
      command !== "explain" &&
      command !== "assess") ||
    !project ||
    project.startsWith("--")
  )
    throw new Error(fullUsage);
  const options = new Map<string, string>();
  const allowedFlags =
    command === "api-rules"
      ? ["--runtime", "--release", "--api-level", "--rules"]
      : command === "explain"
        ? ["--runtime", "--release", "--api-level", "--finding-id"]
        : command === "assess"
          ? [
              "--runtime",
              "--release",
              "--api-level",
              "--rules",
              "--knowledge",
              "--as-of",
              "--format",
            ]
          : [
              "--runtime",
              "--release",
              "--api-level",
              "--timeout-ms",
              "--format",
            ];
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i]!;
    const value = flags[i + 1];
    if (
      !allowedFlags.includes(flag) ||
      !value ||
      value.startsWith("--") ||
      options.has(flag)
    )
      throw new Error(fullUsage);
    options.set(flag, value);
  }
  const runtime = options.get("--runtime");
  const release = options.get("--release");
  if (
    !runtime ||
    !release ||
    !["arkts", "arkweb", "react-native"].includes(runtime) ||
    (command === "scan" &&
      !["json", "markdown", "sarif"].includes(
        options.get("--format") ?? "json",
      )) ||
    (command === "assess" &&
      !["json", "markdown"].includes(options.get("--format") ?? "json"))
  )
    throw new Error(fullUsage);
  const target: TargetProfile = {
    os: "HarmonyOS",
    release,
    runtime: runtime as TargetProfile["runtime"],
  };
  if (options.has("--api-level")) {
    const level = options.get("--api-level")!;
    if (!/^\d+$/.test(level)) throw new Error(fullUsage);
    target.apiLevel = Number(level);
  }
  let timeoutMs: number | undefined;
  if (options.has("--timeout-ms")) {
    const timeout = options.get("--timeout-ms")!;
    const parsed = Number(timeout);
    if (!/^\d+$/.test(timeout) || !Number.isSafeInteger(parsed))
      throw new Error(fullUsage);
    timeoutMs = parsed;
  }
  if (command === "assess") {
    const rulesPath = options.get("--rules");
    const knowledgePath = options.get("--knowledge");
    const asOf = options.get("--as-of");
    if ((knowledgePath && !asOf) || (!knowledgePath && asOf)) {
      throw new Error(fullUsage);
    }
    const rulesText = rulesPath
      ? await readLocalUtf8(
          rulesPath,
          apiRuleSnapshotByteLimit,
          "API rule snapshot",
        )
      : undefined;
    let knowledge;
    if (knowledgePath && asOf) {
      const { loadKnowledgeStore } = await import("@arkcompat/knowledge");
      knowledge = await loadKnowledgeStore(knowledgePath, asOf);
    }
    const scan = await scanProject(project, target);
    const report = assessReport(scan, {
      ...(rulesText === undefined ? {} : { rulesText }),
      ...(knowledge === undefined ? {} : { knowledge }),
      ...(asOf === undefined ? {} : { asOf }),
    });
    const format = (options.get("--format") ??
      "json") as AssessmentReportFormat;
    console.log(formatAssessmentReport(report, format));
    return;
  }
  if (command === "api-rules") {
    const snapshot = options.get("--rules");
    if (!snapshot) throw new Error(fullUsage);
    const text = await readLocalUtf8(
      snapshot,
      apiRuleSnapshotByteLimit,
      "API rule snapshot",
    );
    console.log(
      JSON.stringify(
        evaluateApiRules(await scanProject(project, target), text),
        null,
        2,
      ),
    );
    return;
  }
  if (command === "explain") {
    const findingId = options.get("--finding-id");
    if (!findingId || !/^[a-f0-9]{64}$/.test(findingId))
      throw new Error(fullUsage);
    console.log(
      JSON.stringify(
        explainFinding(await scanProject(project, target), findingId),
        null,
        2,
      ),
    );
    return;
  }
  const format = options.get("--format") ?? "json";
  console.log(
    formatReport(
      await scanProject(
        project,
        target,
        timeoutMs === undefined ? {} : { timeoutMs },
      ),
      format as ReportFormat,
    ),
  );
}
try {
  await main(process.argv.slice(2));
} catch (error) {
  // Filesystem errors include absolute paths; expose only stable codes for them.
  const message =
    error instanceof Error
      ? "code" in error
        ? `Filesystem error: ${String(error.code)}`
        : error.message
      : "Scan failed";
  console.error(message);
  process.exitCode = 1;
}

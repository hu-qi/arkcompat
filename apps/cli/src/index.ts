#!/usr/bin/env node
import {
  apiRuleSnapshotByteLimit,
  evaluateApiRules,
  formatReport,
  scanProject,
} from "@arkcompat/core";
import type { ReportFormat } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";

import { readLocalUtf8 } from "./local-input.js";

const usage =
  "Usage: arkcompat scan <project> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>] [--format <json|markdown|sarif>]\n       arkcompat api-rules <project> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>] --rules <snapshot.json>\n       arkcompat knowledge-export <snapshot.json>";
async function main(args: string[]) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(usage);
    return;
  }
  if (args[0] === "knowledge-export") {
    const path = args[1];
    if (args.length !== 2 || !path || path.startsWith("--"))
      throw new Error(usage);
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
    (command !== "scan" && command !== "api-rules") ||
    !project ||
    project.startsWith("--")
  )
    throw new Error(usage);
  const options = new Map<string, string>();
  const specificFlag = command === "api-rules" ? "--rules" : "--format";
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i]!;
    const value = flags[i + 1];
    if (
      !["--runtime", "--release", "--api-level", specificFlag].includes(flag) ||
      !value ||
      value.startsWith("--") ||
      options.has(flag)
    )
      throw new Error(usage);
    options.set(flag, value);
  }
  const runtime = options.get("--runtime");
  const release = options.get("--release");
  const format = options.get("--format") ?? "json";
  if (
    !runtime ||
    !release ||
    !["arkts", "arkweb", "react-native"].includes(runtime) ||
    !["json", "markdown", "sarif"].includes(format)
  )
    throw new Error(usage);
  const target: TargetProfile = {
    os: "HarmonyOS",
    release,
    runtime: runtime as TargetProfile["runtime"],
  };
  if (options.has("--api-level")) {
    const level = options.get("--api-level")!;
    if (!/^\d+$/.test(level)) throw new Error(usage);
    target.apiLevel = Number(level);
  }
  if (command === "api-rules") {
    const snapshot = options.get("--rules");
    if (!snapshot) throw new Error(usage);
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
  console.log(
    formatReport(await scanProject(project, target), format as ReportFormat),
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

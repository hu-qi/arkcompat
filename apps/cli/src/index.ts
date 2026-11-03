#!/usr/bin/env node
import { scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";

const usage =
  "Usage: arkcompat scan <project> --runtime <arkts|arkweb|react-native> --release <x.y.z> [--api-level <integer>]";
async function main(args: string[]) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(usage);
    return;
  }
  const [command, project, ...flags] = args;
  if (command !== "scan" || !project || project.startsWith("--"))
    throw new Error(usage);
  const options = new Map<string, string>();
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i]!;
    const value = flags[i + 1];
    if (
      !["--runtime", "--release", "--api-level"].includes(flag) ||
      !value ||
      value.startsWith("--") ||
      options.has(flag)
    )
      throw new Error(usage);
    options.set(flag, value);
  }
  const runtime = options.get("--runtime");
  const release = options.get("--release");
  if (
    !runtime ||
    !release ||
    !["arkts", "arkweb", "react-native"].includes(runtime)
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
  console.log(JSON.stringify(await scanProject(project, target), null, 2));
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

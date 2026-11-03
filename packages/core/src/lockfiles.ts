import type { DependencyGraph } from "@arkcompat/contracts";
import { record } from "./declarations.js";

export function selectLockfile(
  entries: string[],
  manifest: unknown,
): DependencyGraph["source"] {
  const npm = entries.includes("npm-shrinkwrap.json")
    ? "npm-shrinkwrap.json"
    : entries.includes("package-lock.json")
      ? "package-lock.json"
      : null;
  const pnpm = entries.includes("pnpm-lock.yaml");
  if (npm && pnpm) {
    const manager =
      record(manifest) && typeof manifest.packageManager === "string"
        ? manifest.packageManager
        : "";
    if (manager.startsWith("pnpm@")) return "pnpm-lock.yaml";
    if (manager.startsWith("npm@")) return npm;
    throw new Error(
      "Multiple npm/pnpm lockfiles: declare npm or pnpm in package.json packageManager",
    );
  }
  return pnpm ? "pnpm-lock.yaml" : npm;
}

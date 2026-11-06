import type {
  DeclaredDependency,
  DependencyGraph,
  ScanReport,
} from "@arkcompat/contracts";
import { record } from "./declarations.js";
import { npmGraph } from "./npm-lock.js";
import { pnpmGraph } from "./pnpm-lock.js";
import { yarnGraph } from "./yarn-lock.js";

export function selectLockfile(
  entries: string[],
  manifest: unknown,
): DependencyGraph["source"] {
  const candidates = new Map<string, NonNullable<DependencyGraph["source"]>>();
  if (entries.includes("npm-shrinkwrap.json"))
    candidates.set("npm", "npm-shrinkwrap.json");
  else if (entries.includes("package-lock.json"))
    candidates.set("npm", "package-lock.json");
  if (entries.includes("pnpm-lock.yaml"))
    candidates.set("pnpm", "pnpm-lock.yaml");
  if (entries.includes("yarn.lock")) candidates.set("yarn", "yarn.lock");
  if (candidates.size <= 1) return candidates.values().next().value ?? null;
  const manager =
    record(manifest) && typeof manifest.packageManager === "string"
      ? manifest.packageManager.split("@")[0]
      : "";
  const selected = candidates.get(manager ?? "");
  if (selected) return selected;
  throw new Error(
    "Multiple npm/pnpm/yarn lockfiles: declare a present manager in package.json packageManager",
  );
}
export function parseDependencyGraph(
  text: string | null,
  source: DependencyGraph["source"],
  declared: DeclaredDependency[],
) {
  switch (source) {
    case "pnpm-lock.yaml":
      return pnpmGraph(text!, declared);
    case "yarn.lock":
      return yarnGraph(text!, declared);
    default:
      return npmGraph(text, source, declared);
  }
}
export function graphCoverage(
  source: DependencyGraph["source"],
  parsed: boolean,
  lockfileVersion: number | null,
): ScanReport["coverage"]["dependencyGraph"] {
  if (!parsed || source === null) return "declarations-only";
  switch (source) {
    case "pnpm-lock.yaml":
      return "pnpm-lockfile-partial";
    case "yarn.lock":
      return lockfileVersion === 1
        ? "yarn-classic-lockfile-partial"
        : "yarn-berry-lockfile-partial";
    default:
      return "npm-lockfile-partial";
  }
}

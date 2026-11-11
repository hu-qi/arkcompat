import { satisfies, valid, validRange } from "semver";
import { packageName } from "./declarations.js";

export type RegistryRangeStatus = "unchecked" | "satisfied" | "mismatch";

function rangeFromSpecifier(specifier: string): string | null {
  if (specifier.length > 2048 || !specifier.trim()) return null;
  if (!specifier.startsWith("npm:")) return specifier;
  const alias = specifier.slice(4);
  const separator = alias.lastIndexOf("@");
  if (
    separator < 1 ||
    !packageName(alias.slice(0, separator)) ||
    !alias.slice(separator + 1)
  )
    return null;
  return alias.slice(separator + 1);
}

/**
 * Check only standard registry semver ranges against an exact locked version.
 * Tags, URLs, local/workspace/patch protocols and malformed ranges stay unchecked.
 */
export function registryRangeStatus(
  specifier: string,
  lockedVersion: string,
): RegistryRangeStatus {
  const candidate = rangeFromSpecifier(specifier);
  if (candidate === null) return "unchecked";
  const range = validRange(candidate, { loose: false });
  if (range === null) return "unchecked";
  const version = valid(lockedVersion, { loose: false });
  if (version === null) return "mismatch";
  return satisfies(version, range, { loose: false }) ? "satisfied" : "mismatch";
}

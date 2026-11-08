import { createHash } from "node:crypto";
import { exactVersion, timestamp } from "./validation.js";

export const ohpmCaptureByteLimit = 2 * 1024 * 1024;
const packagePattern = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function declaredLicense(value: unknown) {
  // Keep a short SPDX-style declaration; do not reflect arbitrary metadata text.
  return typeof value === "string" &&
    value.length <= 128 &&
    /^[a-zA-Z0-9][a-zA-Z0-9.+-]*(?: [a-zA-Z0-9][a-zA-Z0-9.+-]*)*$/.test(value)
    ? value
    : null;
}

/** Offline projection of caller-supplied OHPM metadata, not a mapping or availability verdict. */
export function inspectOhpmCapture(
  text: string,
  name: string,
  version: string,
  observedAt: string,
) {
  if (
    name.length > 214 ||
    !packagePattern.test(name) ||
    !exactVersion(version) ||
    !timestamp(observedAt)
  )
    throw new Error(
      "Invalid OHPM package, exact version or observation timestamp.",
    );
  if (Buffer.byteLength(text, "utf8") > ohpmCaptureByteLimit)
    throw new Error("Invalid OHPM metadata capture: size limit exceeded.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid OHPM metadata capture.");
  }
  if (!record(data) || data.name !== name || !record(data.versions))
    throw new Error("Invalid OHPM metadata capture.");
  const base = {
    schemaVersion: "0.1.0" as const,
    package: name,
    version,
    observedAt,
    compatibility: "unknown" as const,
    evidence: {
      kind: "ohpm-metadata-capture" as const,
      sha256: createHash("sha256").update(text).digest("hex"),
      trust: "caller-supplied-unverified" as const,
    },
  };
  if (!Object.hasOwn(data.versions, version))
    return {
      ...base,
      status: "unknown" as const,
      reason: "version-not-in-capture" as const,
      declaredLicense: null,
    };
  const release = data.versions[version];
  if (!record(release) || release.name !== name || release.version !== version)
    throw new Error("Invalid OHPM release record.");
  return {
    ...base,
    status: "release-observed" as const,
    declaredLicense: declaredLicense(release.license),
  };
}

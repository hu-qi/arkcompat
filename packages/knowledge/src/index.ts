import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import { minVersion, satisfies, valid, validRange } from "semver";
import type {
  KnowledgeRecord,
  KnowledgeSnapshot,
  TargetProfile,
} from "@arkcompat/contracts";

export const knowledgeSnapshotByteLimit = 2 * 1024 * 1024;
const ajv = new Ajv();
const validate = ajv.compile<KnowledgeSnapshot>(
  JSON.parse(
    readFileSync(
      new URL("../../contracts/knowledge.schema.json", import.meta.url),
      "utf8",
    ),
  ) as object,
);
const validateQuery = ajv.compile<KnowledgeQuery>({
  type: "object",
  additionalProperties: false,
  required: ["package", "version", "target"],
  properties: {
    package: { type: "string", minLength: 1, maxLength: 214 },
    version: { type: "string", minLength: 1, maxLength: 256 },
    target: {
      type: "object",
      additionalProperties: false,
      required: ["os", "release", "runtime"],
      properties: {
        os: { const: "HarmonyOS" },
        release: { type: "string", minLength: 1, maxLength: 256 },
        runtime: { enum: ["arkts", "arkweb", "react-native"] },
        apiLevel: {
          type: "integer",
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
        },
      },
    },
  },
});
export interface KnowledgeQuery {
  package: string;
  version: string;
  target: TargetProfile;
}
export type ExclusionReason =
  | "not-reviewed"
  | "expired"
  | "snapshot-not-yet-available"
  | "source-version-mismatch"
  | "runtime-mismatch"
  | "release-mismatch"
  | "api-level-mismatch"
  | "ambiguous-match";
export interface KnowledgeQueryResult {
  status: "unknown";
  snapshotId: string;
  contentHash: string;
  totalRecords: number;
  consideredRecords: number;
  matches: KnowledgeRecord[];
  excluded: { id: string; reasons: ExclusionReason[] }[];
  limitation: string;
}
function timestamp(value: string) {
  const time = Date.parse(value);
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) &&
    Number.isFinite(time) &&
    new Date(time).toISOString() === value.replace(/Z$/, ".000Z")
  );
}
function cleanText(value: string) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
function selector(value: string) {
  return (
    value.length <= 256 &&
    cleanText(value) &&
    validRange(value) !== null &&
    minVersion(value) !== null
  );
}
function exactVersion(value: string) {
  return cleanText(value) && /^[0-9]/.test(value) && valid(value) !== null;
}
function check(snapshot: KnowledgeSnapshot) {
  if (
    !timestamp(snapshot.generatedAt) ||
    !cleanText(snapshot.snapshotId) ||
    snapshot.records.length > 1000
  )
    return false;
  const ids = new Set<string>();
  for (const record of snapshot.records) {
    if (ids.has(record.id)) return false;
    ids.add(record.id);
    const strings = [
      record.id,
      record.source.name,
      ...record.features.included,
      ...record.features.excluded,
      ...record.provenance.flatMap((p) => [p.license, p.sourceVersion]),
      ...(record.target ? [record.target.name] : []),
      ...(record.review.state === "reviewed" ? [record.review.reviewer] : []),
    ];
    if (
      !strings.every(cleanText) ||
      !selector(record.source.versionRange) ||
      !selector(record.profile.releaseRange) ||
      (record.target !== null && !selector(record.target.versionRange)) ||
      !Number.isSafeInteger(record.profile.apiLevel) ||
      !timestamp(record.validUntil)
    )
      return false;
    if (
      record.features.included.some((feature) =>
        record.features.excluded.includes(feature),
      )
    )
      return false;
    for (const source of record.provenance) {
      if (
        !timestamp(source.retrievedAt) ||
        source.retrievedAt > snapshot.generatedAt ||
        source.retrievedAt >= record.validUntil
      )
        return false;
    }
    if (record.review.state === "reviewed") {
      const reviewedAt = record.review.reviewedAt;
      if (
        !timestamp(reviewedAt) ||
        reviewedAt > snapshot.generatedAt ||
        reviewedAt >= record.validUntil ||
        record.provenance.some((p) => p.retrievedAt > reviewedAt)
      )
        return false;
    }
  }
  return true;
}

/** Parses data only. Does not fetch sources, authenticate review or activate rules. */
export function importKnowledge(text: string): KnowledgeSnapshot {
  try {
    if (
      typeof text !== "string" ||
      Buffer.byteLength(text, "utf8") > knowledgeSnapshotByteLimit
    )
      throw new Error();
    const value: unknown = JSON.parse(text);
    if (!validate(value) || !check(value)) throw new Error();
    if (Buffer.byteLength(exported(value), "utf8") > knowledgeSnapshotByteLimit)
      throw new Error();
    return value;
  } catch {
    throw new Error("Invalid knowledge metadata.");
  }
}
function checked(value: unknown) {
  try {
    return importKnowledge(JSON.stringify(value));
  } catch {
    throw new Error("Invalid knowledge metadata.");
  }
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
function exported(snapshot: KnowledgeSnapshot) {
  snapshot.records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(canonical(snapshot), null, 2) + "\n";
}
/** Retains historical/candidate data; canonical formatting is not an approval. */
export function exportKnowledge(value: unknown): string {
  return exported(checked(value));
}

/** Conservative metadata lookup only; never returns a compatibility verdict. */
export function queryKnowledge(
  value: unknown,
  request: unknown,
  asOf: string,
): KnowledgeQueryResult {
  const snapshot = checked(value);
  if (
    !validateQuery(request) ||
    !cleanText(request.package) ||
    !exactVersion(request.version) ||
    !exactVersion(request.target.release) ||
    typeof asOf !== "string" ||
    !timestamp(asOf)
  )
    throw new Error("Invalid knowledge query.");
  const contentHash = createHash("sha256")
    .update(exported(snapshot))
    .digest("hex");
  const matches: KnowledgeRecord[] = [];
  const excluded: KnowledgeQueryResult["excluded"] = [];
  let consideredRecords = 0;
  for (const record of snapshot.records) {
    if (record.source.name !== request.package) continue;
    consideredRecords++;
    const reasons: ExclusionReason[] = [];
    if (record.review.state !== "reviewed") reasons.push("not-reviewed");
    if (asOf >= record.validUntil) reasons.push("expired");
    if (asOf < snapshot.generatedAt) reasons.push("snapshot-not-yet-available");
    if (!satisfies(request.version, record.source.versionRange))
      reasons.push("source-version-mismatch");
    if (record.profile.runtime !== request.target.runtime)
      reasons.push("runtime-mismatch");
    if (!satisfies(request.target.release, record.profile.releaseRange))
      reasons.push("release-mismatch");
    // No unverified inference from OS release to API level or a minimum-level claim.
    if (record.profile.apiLevel !== request.target.apiLevel)
      reasons.push("api-level-mismatch");
    if (reasons.length) excluded.push({ id: record.id, reasons });
    else matches.push(record);
  }
  if (matches.length > 1) {
    excluded.push(
      ...matches.map((record) => ({
        id: record.id,
        reasons: ["ambiguous-match" as const],
      })),
    );
    matches.length = 0;
    excluded.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  return {
    status: "unknown",
    snapshotId: snapshot.snapshotId,
    contentHash,
    totalRecords: snapshot.records.length,
    consideredRecords,
    matches,
    excluded,
    limitation:
      "Metadata matches only; provenance, review identity and compatibility are not verified. No recommendation is made.",
  };
}

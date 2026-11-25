import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { evaluateApiRules } from "../packages/core/dist/index.js";
import {
  exportKnowledge,
  importKnowledge,
  isKnowledgeTimestamp,
} from "../packages/knowledge/dist/index.js";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestPath = "data/snapshot-integrity.json";
const kinds = ["knowledge", "rules"];
const target = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};

function read(root, path, limit) {
  const full = join(root, path);
  try {
    const stat = lstatSync(full);
    if (!stat.isFile() || stat.size > limit || realpathSync(full) !== full)
      throw new Error();
    const bytes = readFileSync(full);
    if (bytes.length > limit) throw new Error();
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    throw new Error(`Cannot read bounded regular data file: ${path}`);
  }
}
function inventory(root) {
  return kinds
    .flatMap((kind) =>
      readdirSync(join(root, "data", kind), { withFileTypes: true }).flatMap(
        (entry) => {
          if (entry.isDirectory())
            throw new Error(
              "Snapshot inventory mismatch: nested directories are not supported.",
            );
          return entry.name.endsWith(".json")
            ? [`data/${kind}/${entry.name}`]
            : [];
        },
      ),
    )
    .sort();
}
function validEntry(entry) {
  if (!entry || typeof entry !== "object" || !kinds.includes(entry.kind))
    return false;
  const allowed = [
    "kind",
    "path",
    "sha256",
    "snapshotId",
    "count",
    ...(entry.kind === "knowledge" ? ["canonicalSha256"] : []),
  ];
  return (
    Object.keys(entry).length === allowed.length &&
    Object.keys(entry).every((key) => allowed.includes(key)) &&
    typeof entry.path === "string" &&
    new RegExp(`^data/${entry.kind}/[A-Za-z0-9][A-Za-z0-9._-]*\\.json$`).test(
      entry.path,
    ) &&
    typeof entry.snapshotId === "string" &&
    /^[A-Za-z0-9._-]{1,128}$/.test(entry.snapshotId) &&
    typeof entry.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(entry.sha256) &&
    Number.isSafeInteger(entry.count) &&
    entry.count > 0 &&
    (entry.kind !== "knowledge" ||
      (typeof entry.canonicalSha256 === "string" &&
        /^[a-f0-9]{64}$/.test(entry.canonicalSha256)))
  );
}
function verify(root) {
  const manifest = JSON.parse(read(root, manifestPath, 64 * 1024));
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    Object.keys(manifest).sort().join(",") !== "entries,schemaVersion" ||
    !Array.isArray(manifest.entries) ||
    !manifest.entries.length ||
    manifest.entries.length > 32 ||
    !manifest.entries.every(validEntry) ||
    !kinds.every((kind) =>
      manifest.entries.some((entry) => entry.kind === kind),
    )
  )
    throw new Error("Invalid snapshot inventory.");
  const entries = [...manifest.entries].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  if (
    JSON.stringify(entries.map((entry) => entry.path)) !==
    JSON.stringify(inventory(root))
  )
    throw new Error(
      "Snapshot inventory mismatch: every bundled JSON snapshot must be pinned exactly once.",
    );
  const checks = entries.map((entry) => {
    const text = read(
      root,
      entry.path,
      entry.kind === "knowledge" ? 2 * 1024 * 1024 : 1024 * 1024,
    );
    if (digest(text) !== entry.sha256)
      throw new Error(`Snapshot digest mismatch: ${entry.path}`);
    if (entry.kind === "knowledge") {
      const data = importKnowledge(text);
      if (data.records.some((record) => record.review.state !== "candidate"))
        throw new Error(
          "Bundled knowledge is candidate-only; reviewed promotion requires an explicit reviewed-data policy change.",
        );
      const canonical = exportKnowledge(data);
      if (canonical !== exportKnowledge(importKnowledge(canonical)))
        throw new Error("Knowledge canonical round-trip mismatch.");
      if (digest(canonical) !== entry.canonicalSha256)
        throw new Error("Knowledge canonical export digest mismatch.");
      if (
        data.snapshotId !== entry.snapshotId ||
        data.records.length !== entry.count
      )
        throw new Error("Knowledge snapshot identity/count mismatch.");
      return {
        ...entry,
        canonicalRoundTrip: true,
        candidateRecords: data.records.length,
        reviewedMappings: 0,
      };
    }
    const evaluation = evaluateApiRules({ target, apiUsages: [] }, text);
    const data = JSON.parse(text);
    if (!isKnowledgeTimestamp(data.generatedAt))
      throw new Error("Invalid rule timestamp.");
    if (
      evaluation.snapshot.id !== entry.snapshotId ||
      data.rules.length !== entry.count
    )
      throw new Error("Rule snapshot identity/count mismatch.");
    return { ...entry, evidence: evaluation.evidence };
  });
  return {
    assessment: "declared-metadata-and-integrity-only",
    snapshots: checks.length,
    reviewedMappings: 0,
    checks,
  };
}
try {
  if (process.argv.length !== 3)
    throw new Error(
      "Usage: node scripts/verify-data-snapshots.mjs <project-root>",
    );
  const root = realpathSync(process.argv[2]);
  process.stdout.write(JSON.stringify(verify(root), null, 2) + "\n");
} catch (error) {
  // Metadata validators emit bounded diagnostics. Filesystem/JSON errors may
  // contain operator paths or input fragments, so do not reflect them.
  const message =
    error instanceof Error &&
    !(error instanceof SyntaxError) &&
    !Object.hasOwn(error, "code")
      ? error.message
      : "Unavailable or malformed snapshot inventory.";
  process.stderr.write(`Data snapshot gate failed: ${message}\n`);
  process.exitCode = 1;
}

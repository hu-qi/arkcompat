import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import type { KnowledgeSnapshot } from "@arkcompat/contracts";
import {
  importKnowledge,
  exportKnowledge,
  queryKnowledge,
} from "../packages/knowledge/src/index.js";

const fixture = JSON.parse(
  await readFile("fixtures/developer/knowledge/snapshot.json", "utf8"),
) as KnowledgeSnapshot;
const asOf = "2026-11-07T00:00:00Z";
const query = {
  package: "synthetic-source",
  version: "1.2.0",
  target: {
    os: "HarmonyOS" as const,
    release: "6.0.0",
    runtime: "arkts" as const,
    apiLevel: 20,
  },
};
function snapshot(reviewed = true) {
  const s = structuredClone(fixture);
  if (reviewed)
    s.records[0]!.review = {
      state: "reviewed",
      reviewer: "developer-fixture-author",
      reviewedAt: s.generatedAt,
    };
  return s;
}
function text(s: unknown) {
  return JSON.stringify(s);
}
function result(s = snapshot(), request = query, time = asOf) {
  return queryKnowledge(importKnowledge(text(s)), request, time);
}

it("imports/exports the existing candidate without activating a recommendation", () => {
  const s = importKnowledge(text(fixture));
  const q = queryKnowledge(s, query, asOf);
  expect({
    status: q.status,
    matches: q.matches,
    excluded: q.excluded,
    total: q.totalRecords,
  }).toEqual({
    status: "unknown",
    matches: [],
    excluded: [{ id: "synthetic.mapping", reasons: ["not-reviewed"] }],
    total: 1,
  });
});
it.each([
  "2026-02-30T00:00:00Z",
  "2026-13-01T00:00:00Z",
  "2026-11-05T24:00:00Z",
  "2026-11-05T00:00:60Z",
  "2026-11-05T00:00:00+00:00",
])("rejects invalid/noncanonical timestamp %s", (time) => {
  const s = snapshot();
  s.generatedAt = time;
  expect(() => importKnowledge(text(s))).toThrow("Invalid knowledge metadata.");
});
it("rejects invalid dates in review, provenance and expiry, not just the snapshot", () => {
  for (const field of ["review", "provenance", "expiry"]) {
    const s = snapshot();
    const r = s.records[0]!;
    if (field === "review")
      r.review = {
        state: "reviewed",
        reviewer: "fixture",
        reviewedAt: "2026-02-30T00:00:00Z",
      };
    else if (field === "provenance")
      r.provenance[0]!.retrievedAt = "2026-02-30T00:00:00Z";
    else r.validUntil = "2026-02-30T00:00:00Z";
    expect(() => importKnowledge(text(s))).toThrow(
      "Invalid knowledge metadata.",
    );
  }
});
it("accepts a leap day and rejects future provenance/review and reversed expiry", () => {
  const leap = snapshot();
  leap.generatedAt = "2028-02-29T00:00:00Z";
  expect(importKnowledge(text(leap)).generatedAt).toBe(leap.generatedAt);
  for (const field of ["provenance", "review", "expiry"]) {
    const s = snapshot();
    const r = s.records[0]!;
    if (field === "provenance")
      r.provenance[0]!.retrievedAt = "2026-11-06T00:00:00Z";
    else if (field === "review")
      r.review = {
        state: "reviewed",
        reviewer: "fixture",
        reviewedAt: "2026-11-06T00:00:00Z",
      };
    else r.validUntil = "2026-11-04T00:00:00Z";
    expect(() => importKnowledge(text(s))).toThrow(
      "Invalid knowledge metadata.",
    );
  }
});
it.each([
  "latest",
  "git+https://example.invalid/repo",
  "workspace:*",
  "   ",
  ">2 <1",
  "1.0.0 || ".repeat(100),
])("rejects invalid, unsatisfiable or unbounded selector %s", (range) => {
  for (const field of ["source", "target", "release"]) {
    const s = snapshot();
    const r = s.records[0]!;
    if (field === "source") r.source.versionRange = range;
    else if (field === "target") r.target!.versionRange = range;
    else r.profile.releaseRange = range;
    expect(() => importKnowledge(text(s))).toThrow(
      "Invalid knowledge metadata.",
    );
  }
});
it("rejects duplicate IDs even when their record bodies differ", () => {
  const s = snapshot();
  const second = structuredClone(s.records[0]!);
  second.source.versionRange = "^2.0.0";
  s.records.push(second);
  expect(() => importKnowledge(text(s))).toThrow("Invalid knowledge metadata.");
});
it("rejects contradictory feature scope and whitespace-only metadata", () => {
  const s = snapshot();
  s.records[0]!.features.excluded = [...s.records[0]!.features.included];
  expect(() => importKnowledge(text(s))).toThrow();
  s.records[0]!.features.excluded = ["synthetic-gap"];
  s.records[0]!.provenance[0]!.license = "  ";
  expect(() => importKnowledge(text(s))).toThrow();
});
it("rejects malformed JSON/schema, oversized snapshots and excessive records", () => {
  for (const value of [
    "{",
    "null",
    text({ ...snapshot(), verified: true }),
    " ".repeat(2 * 1024 * 1024 + 1),
  ])
    expect(() => importKnowledge(value)).toThrow();
  const s = snapshot();
  s.records = Array.from({ length: 1001 }, (_, i) => ({
    ...s.records[0]!,
    id: `synthetic.${i}`,
  }));
  expect(() => importKnowledge(text(s))).toThrow();
});
it("returns reviewed scoped metadata with unknown status and unchanged partial exclusions", () => {
  const s = snapshot();
  const q = result(s);
  expect({
    status: q.status,
    matches: q.matches,
    exclusions: q.excluded,
    limitation: q.limitation,
  }).toEqual({
    status: "unknown",
    matches: s.records,
    exclusions: [],
    limitation:
      "Metadata matches only; provenance, review identity and compatibility are not verified. No recommendation is made.",
  });
});
it("withholds records at the exact expiry boundary, but retains them in export", () => {
  const s = snapshot();
  s.records[0]!.validUntil = asOf;
  expect({
    excluded: result(s).excluded,
    exported: importKnowledge(exportKnowledge(s)).records,
  }).toEqual({
    excluded: [{ id: "synthetic.mapping", reasons: ["expired"] }],
    exported: s.records,
  });
});
it("does not use a snapshot before its generation date", () => {
  expect(result(snapshot(), query, "2026-11-04T00:00:00Z").excluded).toEqual([
    { id: "synthetic.mapping", reasons: ["snapshot-not-yet-available"] },
  ]);
});
it.each([
  [{ ...query, version: "2.0.0" }, "source-version-mismatch"],
  [
    { ...query, target: { ...query.target, runtime: "arkweb" as const } },
    "runtime-mismatch",
  ],
  [
    { ...query, target: { ...query.target, release: "6.1.0" } },
    "release-mismatch",
  ],
  [
    { ...query, target: { ...query.target, apiLevel: 21 } },
    "api-level-mismatch",
  ],
  [
    {
      ...query,
      target: {
        os: "HarmonyOS" as const,
        release: "6.0.0",
        runtime: "arkts" as const,
      },
    },
    "api-level-mismatch",
  ],
])(
  "withholds inapplicable profile/version metadata (%j)",
  (request, reason) => {
    expect(result(snapshot(), request as typeof query).excluded).toEqual([
      { id: "synthetic.mapping", reasons: [reason] },
    ]);
  },
);
it("does not wildcard unknown runtime or opt prereleases into stable ranges", () => {
  const s = snapshot();
  s.records[0]!.profile.runtime = "unknown";
  expect(result(s).excluded[0]!.reasons).toContain("runtime-mismatch");
  expect(
    result(snapshot(), { ...query, version: "1.2.0-beta.1" }).excluded[0]!
      .reasons,
  ).toContain("source-version-mismatch");
  const pre = snapshot();
  pre.records[0]!.source.versionRange = ">=1.2.0-beta.1 <1.2.0";
  expect(
    result(pre, { ...query, version: "1.2.0-beta.2" }).matches,
  ).toHaveLength(1);
});
it("withholds every overlapping active metadata match instead of choosing a winner", () => {
  const s = snapshot();
  const second = structuredClone(s.records[0]!);
  second.id = "synthetic.other";
  second.target!.name = "synthetic-other-target";
  s.records.push(second);
  const q = result(s);
  expect({ matches: q.matches, reasons: q.excluded }).toEqual({
    matches: [],
    reasons: [
      { id: "synthetic.mapping", reasons: ["ambiguous-match"] },
      { id: "synthetic.other", reasons: ["ambiguous-match"] },
    ],
  });
});
it("does not let an expired competitor hide the unique current metadata match", () => {
  const s = snapshot();
  const second = structuredClone(s.records[0]!);
  second.id = "synthetic.old";
  second.validUntil = "2026-11-06T00:00:00Z";
  s.records.push(second);
  expect(result(s).matches.map((r) => r.id)).toEqual(["synthetic.mapping"]);
});
it("does not infer absent or missing ports from package lookup misses", () => {
  expect(
    result(snapshot(), { ...query, package: "nonexistent" }),
  ).toMatchObject({
    status: "unknown",
    matches: [],
    excluded: [],
    totalRecords: 1,
    consideredRecords: 0,
  });
});
it("exports deterministic sorted JSON with stable hashes across input key/record order", () => {
  const s = snapshot();
  const second = structuredClone(s.records[0]!);
  second.id = "aaa.synthetic";
  second.source.name = "other-source";
  s.records.push(second);
  const reversed = {
    records: [...s.records].reverse(),
    generatedAt: s.generatedAt,
    snapshotId: s.snapshotId,
    schemaVersion: s.schemaVersion,
  };
  expect({
    json: exportKnowledge(reversed),
    hash: queryKnowledge(reversed, query, asOf).contentHash,
  }).toEqual({ json: exportKnowledge(s), hash: result(s).contentHash });
});
it("validates mutated objects again before export/query and requires explicit exact query context", () => {
  const s = importKnowledge(text(snapshot()));
  s.records[0]!.source.versionRange = "BAD";
  expect(() => exportKnowledge(s)).toThrow();
  expect(() => queryKnowledge(s, query, asOf)).toThrow();
  for (const request of [
    { ...query, version: "^1.0.0" },
    { ...query, target: { ...query.target, release: "latest" } },
    { ...query, target: { ...query.target, apiLevel: -1 } },
  ])
    expect(() => queryKnowledge(snapshot(), request, asOf)).toThrow(
      "Invalid knowledge query.",
    );
  expect(() => result(snapshot(), query, "2026-02-30T00:00:00Z")).toThrow(
    "Invalid knowledge query.",
  );
});

it("rejects metadata whose canonical export would exceed the import limit", () => {
  const s = snapshot();
  s.records[0]!.features.included = [""];
  const available = 2 * 1024 * 1024 - Buffer.byteLength(text(s)) - 10;
  s.records[0]!.features.included = ["x".repeat(available)];
  // Compact input fits, expanded deterministic output does not.
  const compact = text(s);
  expect(Buffer.byteLength(compact)).toBeLessThanOrEqual(2 * 1024 * 1024);
  expect(() => importKnowledge(compact)).toThrow("Invalid knowledge metadata.");
});

it("rejects review preceding its evidence and retains all query rejection reasons", () => {
  const s = snapshot();
  s.records[0]!.review = {
    state: "reviewed",
    reviewer: "fixture",
    reviewedAt: "2026-11-04T00:00:00Z",
  };
  expect(() => importKnowledge(text(s))).toThrow("Invalid knowledge metadata.");
  const old = snapshot(false);
  old.records[0]!.validUntil = "2026-11-06T00:00:00Z";
  const q = result(old, { ...query, version: "2.0.0" });
  expect(q.excluded[0]!.reasons).toEqual([
    "not-reviewed",
    "expired",
    "source-version-mismatch",
  ]);
});

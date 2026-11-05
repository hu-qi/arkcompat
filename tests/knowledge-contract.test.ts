import { readFile } from "node:fs/promises";
import { Ajv } from "ajv";
import { expect, it } from "vitest";
import { scanProject } from "@arkcompat/core";
import type { KnowledgeSnapshot } from "@arkcompat/contracts";

const schema = JSON.parse(
  await readFile("packages/contracts/knowledge.schema.json", "utf8"),
) as object;
const validate = new Ajv({ allErrors: true }).compile(schema);
function snapshot() {
  return {
    schemaVersion: "0.1.0",
    snapshotId: "developer-fixture-only",
    generatedAt: "2026-11-05T00:00:00Z",
    records: [
      {
        id: "synthetic.mapping",
        source: { name: "synthetic-source", versionRange: "^1.0.0" },
        target: {
          registry: "ohpm",
          name: "synthetic-target",
          versionRange: "^2.0.0",
        },
        availability: "ohpm-release",
        relation: "partial",
        profile: {
          os: "HarmonyOS",
          releaseRange: "6.0.0",
          apiLevel: 20,
          runtime: "arkts",
        },
        features: {
          included: ["synthetic-feature"],
          excluded: ["synthetic-gap"],
        },
        provenance: [
          {
            url: "https://example.invalid/evidence",
            license: "LicenseRef-DeveloperFixture",
            sourceVersion: "fixture-1",
            retrievedAt: "2026-11-05T00:00:00Z",
          },
        ],
        review: {
          state: "candidate",
          reviewer: null as string | null,
          reviewedAt: null as string | null,
        },
        validUntil: "2026-12-01T00:00:00Z",
      },
    ],
  };
}
it("accepts explicit synthetic partial candidate metadata without treating it as approval", () => {
  expect(validate(snapshot())).toBe(true);
});
it.each(["source", "profile", "provenance", "review", "validUntil"])(
  "rejects missing mandatory knowledge field %s",
  (key) => {
    const s = snapshot();
    Reflect.deleteProperty(s.records[0]!, key);
    expect(validate(s)).toBe(false);
  },
);
it("rejects empty version ranges, provenance and partial feature exclusions", () => {
  const s = snapshot();
  s.records[0]!.source.versionRange = "";
  s.records[0]!.provenance = [];
  s.records[0]!.features.excluded = [];
  expect(validate(s)).toBe(false);
});
it("rejects review promotion without a reviewer and date", () => {
  const s = snapshot();
  s.records[0]!.review.state = "reviewed";
  expect(validate(s)).toBe(false);
});
it("allows review metadata with explicit attribution without making a runtime claim", () => {
  const s = snapshot();
  s.records[0]!.review = {
    state: "reviewed",
    reviewer: "synthetic-reviewer",
    reviewedAt: "2026-11-05T00:00:00Z",
  };
  expect(validate(s)).toBe(true);
});
it.each([
  "https://synthetic-user@example.invalid/doc",
  "https://example.invalid/doc?token=secret",
  "file:///private/doc",
  "javascript:alert(1)",
])("rejects credential-bearing or nonpublic provenance URLs: %s", (url) => {
  const s = snapshot();
  s.records[0]!.provenance[0]!.url = url;
  expect(validate(s)).toBe(false);
});
it.each(["unknown", "missing-port", "pure-js", "gitcode-port"])(
  "distinguishes availability %s and its target relationship",
  (availability) => {
    const s = snapshot();
    const r = s.records[0]!;
    if (availability === "gitcode-port") r.target.registry = "gitcode";
    else {
      Reflect.set(r, "target", null);
      r.relation =
        availability === "unknown"
          ? "unknown"
          : availability === "missing-port"
            ? "none"
            : "full";
    }
    r.availability = availability;
    expect(validate(s)).toBe(true);
  },
);
it("rejects a claimed missing port with a target replacement", () => {
  const s = snapshot();
  s.records[0]!.availability = "missing-port";
  expect(validate(s)).toBe(false);
});
it("rejects arbitrary verified-compatible and confidence assertions", () => {
  const s = snapshot();
  Reflect.set(s.records[0]!, "verifiedCompatible", true);
  Reflect.set(s.records[0]!, "confidence", 1);
  expect(validate(s)).toBe(false);
});
it("retains expired metadata as historical data rather than silently renewing it", () => {
  const s = snapshot();
  s.records[0]!.validUntil = "2020-01-01T00:00:00Z";
  const before = JSON.stringify(s);
  expect({ valid: validate(s), unchanged: JSON.stringify(s) }).toEqual({
    valid: true,
    unchanged: before,
  });
});
it("accepts an honest empty snapshot without inventing knowledge coverage", () => {
  const s = snapshot();
  s.records = [];
  expect(validate(s)).toBe(true);
});
it("validates the authored fixture without activating it as scanner knowledge", async () => {
  const candidate = JSON.parse(
    await readFile("fixtures/developer/knowledge/snapshot.json", "utf8"),
  ) as KnowledgeSnapshot;
  const report = await scanProject("fixtures/developer/source-api", {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
  });
  expect({
    valid: validate(candidate),
    state: candidate.records[0]?.review.state,
    scannerKnowledge: report.snapshots.knowledge,
    statuses: [...new Set(report.findings.map((f) => f.status))],
  }).toEqual({
    valid: true,
    state: "candidate",
    scannerKnowledge: "none",
    statuses: ["unknown"],
  });
});

import { expect, it } from "vitest";
import { scanProject } from "@arkcompat/core";
import { registryRangeStatus } from "../packages/core/src/registry-range.js";
import type { TargetProfile } from "@arkcompat/contracts";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};

it.each([
  ["1.0.0", "1.0.0", "satisfied"],
  ["^1.0.0", "1.9.9", "satisfied"],
  [">=1.0.0 <2.0.0", "2.0.0", "mismatch"],
  ["1.2.3 - 2.0.0", "2.0.0", "satisfied"],
  ["*", "99.0.0", "satisfied"],
  [">=1.0.0-beta.1 <2.0.0", "1.0.0-beta.2", "satisfied"],
  ["^1.0.0 || ^3.0.0", "3.5.0", "satisfied"],
  ["^1.0.0", "not-a-version", "mismatch"],
])(
  "classifies standard range %s against version %s as %s",
  (range, version, expected) => {
    expect(registryRangeStatus(range, version)).toBe(expected);
  },
);

it.each(["npm:real-package@>=3.0.0 <4.0.0", "npm:@scope/real@^2.0.0"])(
  "extracts a standard range from npm alias %s",
  (specifier) => {
    expect(registryRangeStatus(specifier, "3.2.0")).toBe(
      specifier.includes("real@^2") ? "mismatch" : "satisfied",
    );
  },
);

it.each([
  "latest",
  "workspace:*",
  "file:../local",
  "https://example.invalid/archive",
  "patch:private#fixture",
  "",
  "npm:missing-range",
  "npm:../../private@^1",
])("does not infer satisfaction from %s", (specifier) => {
  expect(registryRangeStatus(specifier, "1.0.0")).toBe("unchecked");
});

it("bounds oversized ranges before parsing", () => {
  expect(registryRangeStatus("^" + "1".repeat(2048), "1.0.0")).toBe(
    "unchecked",
  );
});

it("keeps a semver mismatch target visible in the authored fixture", async () => {
  const report = await scanProject("fixtures/developer/semver-ranges", target);
  expect({
    schema: report.schemaVersion,
    resolutions: report.dependencyGraph.edges.map((edge) => [
      edge.name,
      edge.resolution,
      edge.to,
    ]),
    mismatch: report.coverage.limitations.find(
      (item) => item.code === "dependency-range-mismatch",
    ),
  }).toEqual({
    schema: "0.12.0",
    resolutions: [
      ["good", "locked", "node_modules/good"],
      ["latest-tag", "locked", "node_modules/latest-tag"],
      ["mismatch", "mismatch", "node_modules/mismatch"],
      ["preview", "locked", "node_modules/preview"],
    ],
    mismatch: {
      code: "dependency-range-mismatch",
      path: "package.json",
    },
  });
});

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import type { ValidateFunction } from "ajv";
import { minVersion, satisfies, validRange } from "semver";
import type { ApiUsage, ScanReport, TargetProfile } from "@arkcompat/contracts";

export const apiRuleSnapshotByteLimit = 1024 * 1024;

type Selector = Pick<ApiUsage, "module" | "path" | "kind">;
type Profile = Required<Omit<TargetProfile, "os">>;
interface ApiRule {
  id: string;
  selector: Selector;
  profile: Profile;
  source: { url: string; revision: string };
}
interface ApiRuleSnapshot {
  schemaVersion: "0.1.0";
  snapshotId: string;
  rules: ApiRule[];
}
interface ApiRuleV2 {
  id: string;
  selector: {
    module: string;
    path: string[];
    kind: "call" | "construct" | "any";
    pathMatch: "exact" | "prefix" | "module";
  };
  profile: {
    releaseRange: string;
    runtime: TargetProfile["runtime"];
    minApiLevel: number;
    maxApiLevel?: number;
  };
  classification: "incompatible" | "conditional" | "potential-risk";
  severity: "critical" | "high" | "medium" | "low";
  priority: number;
  rationale: string;
  recommendedAction: string;
  source: { url: string; revision: string; title?: string };
}
interface ApiRuleSnapshotV2 {
  schemaVersion: "0.2.0";
  snapshotId: string;
  generatedAt: string;
  rules: ApiRuleV2[];
}
type AnyApiRuleSnapshot = ApiRuleSnapshot | ApiRuleSnapshotV2;
type ApiRuleResult = { usage: ApiUsage } & (
  | {
      status: "unknown";
      reason: "missing-api-level" | "no-exact-rule" | "ambiguous-rule";
    }
  | {
      status: "potential-risk";
      tier: "rule-static";
      ruleId: string;
      source: ApiRule["source"];
    }
);
export type ApiRuleResultV2 = { usage: ApiUsage } & (
  | {
      status: "unknown";
      reason: "missing-api-level" | "no-exact-rule" | "ambiguous-rule";
    }
  | {
      status: ApiRuleV2["classification"];
      tier: "rule-static";
      severity: ApiRuleV2["severity"];
      priority: number;
      ruleId: string;
      rationale: string;
      recommendedAction: string;
      source: ApiRuleV2["source"];
    }
);
let validate: ValidateFunction<AnyApiRuleSnapshot> | undefined;

function key(selector: Selector, profile: TargetProfile) {
  return JSON.stringify([
    profile.os,
    profile.release,
    profile.runtime,
    profile.apiLevel,
    selector.module,
    selector.path,
    selector.kind,
  ]);
}

function matchesV2(
  rule: ApiRuleV2,
  usage: ApiUsage,
  target: TargetProfile & { apiLevel: number },
): boolean {
  if (rule.profile.runtime !== target.runtime) return false;
  if (target.apiLevel < rule.profile.minApiLevel) return false;
  if (
    rule.profile.maxApiLevel !== undefined &&
    target.apiLevel > rule.profile.maxApiLevel
  )
    return false;
  if (!satisfies(target.release, rule.profile.releaseRange)) return false;
  if (rule.selector.module !== usage.module) return false;
  if (rule.selector.kind !== "any" && rule.selector.kind !== usage.kind)
    return false;
  if (rule.selector.pathMatch === "module") return usage.path.length > 0;
  if (rule.selector.pathMatch === "prefix") {
    return (
      usage.path.length >= rule.selector.path.length &&
      rule.selector.path.every((segment, i) => usage.path[i] === segment)
    );
  }
  return (
    usage.path.length === rule.selector.path.length &&
    rule.selector.path.every((segment, i) => usage.path[i] === segment)
  );
}

function evaluateV2(
  report: Pick<ScanReport, "target" | "apiUsages">,
  data: ApiRuleSnapshotV2,
  sha256: string,
) {
  const ids = new Set<string>();
  for (const rule of data.rules) {
    if (ids.has(rule.id))
      throw new Error("API rule snapshot has a duplicate rule ID.");
    ids.add(rule.id);
    const range = validRange(rule.profile.releaseRange);
    const min = minVersion(rule.profile.releaseRange);
    if (!range || !min || min.major < 6)
      throw new Error("Invalid API rule releaseRange.");
    if (
      rule.profile.maxApiLevel !== undefined &&
      rule.profile.maxApiLevel < rule.profile.minApiLevel
    )
      throw new Error("Invalid API rule API level bounds.");
  }
  const { target, apiUsages } = report;
  let incompatible = 0;
  let conditional = 0;
  let potentialRisk = 0;
  const results = apiUsages.map((usage): ApiRuleResultV2 => {
    if (target.apiLevel === undefined)
      return { usage, status: "unknown", reason: "missing-api-level" };
    const targetWithLevel = { ...target, apiLevel: target.apiLevel };
    const matched = data.rules.filter((rule) =>
      matchesV2(rule, usage, targetWithLevel),
    );
    if (!matched.length)
      return { usage, status: "unknown", reason: "no-exact-rule" };
    const topPriority = Math.max(...matched.map((r) => r.priority));
    const topRules = matched.filter((r) => r.priority === topPriority);
    if (topRules.length > 1)
      return { usage, status: "unknown", reason: "ambiguous-rule" };
    const best = topRules[0]!;
    if (best.classification === "incompatible") incompatible++;
    else if (best.classification === "conditional") conditional++;
    else potentialRisk++;
    return {
      usage,
      status: best.classification,
      tier: "rule-static",
      severity: best.severity,
      priority: best.priority,
      ruleId: best.id,
      rationale: best.rationale,
      recommendedAction: best.recommendedAction,
      source: best.source,
    };
  });
  return {
    schemaVersion: "0.2.0" as const,
    evidence: "declared-source-rule-static" as const,
    target,
    snapshot: { id: data.snapshotId, sha256 },
    counts: {
      observed: results.length,
      incompatible,
      conditional,
      potentialRisk,
      unknown: results.length - incompatible - conditional - potentialRisk,
    },
    results,
  };
}

/** Local advisory evaluation. Declared sources are never fetched or authenticated. */
export function evaluateApiRules(
  report: Pick<ScanReport, "target" | "apiUsages">,
  text: string,
) {
  if (Buffer.byteLength(text, "utf8") > apiRuleSnapshotByteLimit)
    throw new Error("API rule snapshot exceeds the byte limit.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("API rule snapshot is not valid JSON.");
  }
  validate ??= new Ajv().compile<AnyApiRuleSnapshot>(
    JSON.parse(
      readFileSync(
        new URL("../../contracts/api-rules.schema.json", import.meta.url),
        "utf8",
      ),
    ) as object,
  );
  if (!validate(data)) throw new Error("Invalid API rule snapshot.");
  const sha256 = createHash("sha256").update(text).digest("hex");
  if (data.schemaVersion === "0.2.0") return evaluateV2(report, data, sha256);
  const ids = new Set<string>();
  const index = new Map<string, ApiRule | null>();
  for (const rule of data.rules) {
    if (ids.has(rule.id))
      throw new Error("API rule snapshot has a duplicate rule ID.");
    ids.add(rule.id);
    const signature = key(rule.selector, { os: "HarmonyOS", ...rule.profile });
    index.set(signature, index.has(signature) ? null : rule);
  }

  const { target, apiUsages } = report;
  let potentialRisk = 0;
  const results = apiUsages.map((usage): ApiRuleResult => {
    if (target.apiLevel === undefined)
      return { usage, status: "unknown", reason: "missing-api-level" };
    const match = index.get(key(usage, target));
    if (match === null)
      return { usage, status: "unknown", reason: "ambiguous-rule" };
    if (match === undefined)
      return { usage, status: "unknown", reason: "no-exact-rule" };
    potentialRisk++;
    return {
      usage,
      status: "potential-risk",
      tier: "rule-static",
      ruleId: match.id,
      source: match.source,
    };
  });
  return {
    schemaVersion: "0.1.0" as const,
    evidence: "declared-source-unverified" as const,
    target,
    snapshot: {
      id: data.snapshotId,
      sha256,
    },
    counts: {
      observed: results.length,
      potentialRisk,
      unknown: results.length - potentialRisk,
    },
    results,
  };
}

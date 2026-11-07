import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import type { ValidateFunction } from "ajv";
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
let validate: ValidateFunction<ApiRuleSnapshot> | undefined;

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
  validate ??= new Ajv().compile<ApiRuleSnapshot>(
    JSON.parse(
      readFileSync(
        new URL("../../contracts/api-rules.schema.json", import.meta.url),
        "utf8",
      ),
    ) as object,
  );
  if (!validate(data)) throw new Error("Invalid API rule snapshot.");
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
      sha256: createHash("sha256").update(text).digest("hex"),
    },
    counts: {
      observed: results.length,
      potentialRisk,
      unknown: results.length - potentialRisk,
    },
    results,
  };
}

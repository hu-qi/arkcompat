import type {
  Finding,
  FindingExplanation,
  ScanReport,
} from "@arkcompat/contracts";

function action(
  ruleId: Finding["ruleId"],
): FindingExplanation["recommendedAction"] {
  switch (ruleId) {
    case "inventory.dependency":
      return {
        code: "verify-reviewed-package-evidence",
        text: "Resolve the installed package version, then compare the exact source and target runtime profile with reviewed OHPM, port or pure-JavaScript evidence before changing dependency declarations.",
        compatibilityClaim: false,
        evidenceRequired: true,
      };
    case "inventory.module-reference":
      return {
        code: "verify-reviewed-module-evidence",
        text: "Resolve the imported module and verify its documented availability for the exact target profile; do not infer compatibility from an import inventory entry.",
        compatibilityClaim: false,
        evidenceRequired: true,
      };
    case "inventory.api-usage":
      return {
        code: "verify-reviewed-api-evidence",
        text: "Verify the observed API path and call form against authoritative, version-scoped SDK/API evidence for the target release, runtime and API level before changing source.",
        compatibilityClaim: false,
        evidenceRequired: true,
      };
    default:
      throw new Error("Unsupported inventory rule.");
  }
}

/** Pure, local projection of one canonical finding; no network, model or package execution. */
export function explainFinding(
  report: ScanReport,
  findingId: string,
): FindingExplanation {
  const finding = report.findings.find((item) => item.id === findingId);
  if (!finding) throw new Error("Finding is unavailable in this report.");
  if (JSON.stringify(finding.target) !== JSON.stringify(report.target))
    throw new Error("Finding target profile does not match the report.");

  return {
    explanationVersion: "0.1.0",
    finding: structuredClone(finding),
    source: structuredClone(finding.location),
    target: structuredClone(report.target),
    rule: {
      id: finding.ruleId,
      status: finding.status,
      tier: finding.tier,
      severity: finding.severity,
    },
    evidence: structuredClone(finding.evidence),
    explanation: finding.explanation,
    limitations: structuredClone(report.coverage.limitations),
    recommendedAction: action(finding.ruleId),
    snapshots: structuredClone(report.snapshots),
  };
}

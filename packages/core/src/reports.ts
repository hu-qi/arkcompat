import type { AssessmentReport, ScanReport } from "@arkcompat/contracts";

export type ReportFormat = "json" | "markdown" | "sarif";
export type AssessmentReportFormat = "json" | "markdown";

function markdown(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  };
  return value
    .replace(/[&<>]/g, (character) => entities[character]!)
    .replace(
      /[\u0000-\u001f\u007f-\u009f]/g,
      (character) =>
        `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
    )
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, "\\$&");
}
function artifactUri(path: string): string {
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(path) ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Report location must be a relative scan path");
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

/** Pure adapters for canonical inventory reports; no source, network or filesystem reads. */
export function formatReport(
  report: ScanReport,
  format: ReportFormat = "json",
): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (format === "markdown") {
    const lines = [
      "# ArkCompat scan report",
      "",
      "Inventory only: compatibility has not been evaluated. No verified replacement is available from this report.",
      "",
      `Target: ${markdown(report.target.os)} ${markdown(report.target.release)} / ${markdown(report.target.runtime)} / API ${report.target.apiLevel ?? "unspecified"}`,
      `Scanner: ${markdown(report.scannerVersion)}; schema: ${markdown(report.schemaVersion)}; rules: ${markdown(report.snapshots.rules)}; knowledge: ${markdown(report.snapshots.knowledge)}`,
      `Coverage: ${markdown(report.coverage.dependencyGraph)}; source files: ${report.coverage.sourceFiles}; compatibility: ${markdown(report.coverage.compatibility)}`,
      "",
      "## Findings",
      "",
    ];
    if (!report.findings.length)
      lines.push(
        "No inventory findings. This does not establish compatibility.",
      );
    else {
      lines.push(
        "| ID | Rule | Status | Severity | Location | Evidence | Explanation |",
        "|---|---|---|---|---|---|---|",
      );
      for (const finding of report.findings) {
        const evidence = finding.evidence
          .map((e) => `${e.kind}: ${e.value ?? "(unresolved)"}`)
          .join("; ");
        lines.push(
          `| ${[finding.id, finding.ruleId, finding.status, finding.severity, `${finding.location.path}:${finding.location.line}:${finding.location.column}`, evidence, finding.explanation].map(markdown).join(" | ")} |`,
        );
      }
    }
    lines.push("", "## Limitations", "");
    if (!report.coverage.limitations.length)
      lines.push("None reported. This does not establish compatibility.");
    else {
      lines.push("| Code | Path |", "|---|---|");
      for (const limitation of report.coverage.limitations)
        lines.push(
          `| ${markdown(limitation.code)} | ${markdown(limitation.path ?? "(project)")} |`,
        );
    }
    return lines.join("\n");
  }
  if (format === "sarif") {
    const rules = [...new Set(report.findings.map((f) => f.ruleId))];
    return JSON.stringify(
      {
        $schema:
          "https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json",
        version: "2.1.0",
        runs: [
          {
            tool: {
              driver: {
                name: "ArkCompat",
                version: report.scannerVersion,
                rules: rules.map((id) => ({
                  id,
                  shortDescription: {
                    text: "Inventory evidence; compatibility unknown",
                  },
                  defaultConfiguration: { level: "note" },
                })),
              },
            },
            columnKind: "utf16CodeUnits",
            properties: {
              schemaVersion: report.schemaVersion,
              target: report.target,
              snapshots: report.snapshots,
              coverage: report.coverage,
            },
            results: report.findings.map((finding) => ({
              ruleId: finding.ruleId,
              ruleIndex: rules.indexOf(finding.ruleId),
              kind: "informational",
              level: "note",
              message: { text: finding.explanation },
              partialFingerprints: { "arkcompat/v1": finding.id },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: {
                      uri: artifactUri(finding.location.path),
                    },
                    region: {
                      startLine: finding.location.line,
                      startColumn: finding.location.column,
                    },
                  },
                },
              ],
              properties: {
                canonicalFindingId: finding.id,
                status: finding.status,
                tier: finding.tier,
                target: finding.target,
                evidence: finding.evidence,
              },
            })),
          },
        ],
      },
      null,
      2,
    );
  }
  throw new Error("Unsupported report format");
}

/** Pure adapters for advisory assessment reports; no source, network or filesystem reads. */
export function formatAssessmentReport(
  report: AssessmentReport,
  format: AssessmentReportFormat = "json",
): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (format === "markdown") {
    const rulesDesc =
      report.snapshots.rules === "none"
        ? "none"
        : `${report.snapshots.rules.id} (${report.snapshots.rules.sha256.slice(0, 12)})`;
    const knowledgeDesc =
      report.snapshots.knowledge === "none"
        ? "none"
        : `${report.snapshots.knowledge.id} (${report.snapshots.knowledge.sha256.slice(0, 12)}, asOf ${report.snapshots.knowledge.asOf})`;
    const lines = [
      "# ArkCompat assessment report",
      "",
      `Target: ${markdown(report.target.os)} ${markdown(report.target.release)} / ${markdown(report.target.runtime)} / API ${report.target.apiLevel ?? "unspecified"}`,
      `Scanner: ${markdown(report.scannerVersion)}; schema: ${markdown(report.schemaVersion)}; rules: ${markdown(rulesDesc)}; knowledge: ${markdown(knowledgeDesc)}`,
      "",
      "## Dependency assessments",
      "",
    ];
    if (!report.dependencies.length) {
      lines.push("No declared dependencies found.");
    } else {
      lines.push(
        "| Module | Package | Version | Availability | Classification | Substitute | Limitations | Location | Recommended action |",
        "|---|---|---|---|---|---|---|---|---|",
      );
      for (const dep of report.dependencies) {
        const sub = dep.replacement
          ? `${dep.replacement.registry}:${dep.replacement.name} (${dep.replacement.versionRange}, ${dep.replacement.relation})`
          : "-";
        const limits = dep.replacement
          ? dep.replacement.excludedFeatures.join(", ") || "none"
          : dep.excludedRecordReasons
              .map((r) => `${r.id}: ${r.reasons.join("/")}`)
              .join("; ") || "-";
        const loc = dep.location
          ? `${dep.location.path}:${dep.location.line}:${dep.location.column}`
          : "-";
        lines.push(
          `| ${[dep.modulePath, dep.name, dep.resolvedVersion ?? dep.specifier, dep.availability, dep.classification, sub, limits, loc, dep.recommendedAction].map(markdown).join(" | ")} |`,
        );
      }
    }
    lines.push("", "## API assessments", "");
    if (!report.apiAssessments.length) {
      lines.push("No API usages observed.");
    } else {
      lines.push(
        "| Location | Module | Path | Status | Rule / Reason | Source | Recommended action |",
        "|---|---|---|---|---|---|---|",
      );
      for (const api of report.apiAssessments) {
        const loc = `${api.location.path}:${api.location.line}:${api.location.column}`;
        const ruleOrReason = api.ruleId ?? api.reason ?? "-";
        const src = api.source
          ? `${api.source.revision} (${api.source.url})`
          : "-";
        lines.push(
          `| ${[loc, api.module, api.path.join("."), api.status, ruleOrReason, src, api.recommendedAction].map(markdown).join(" | ")} |`,
        );
      }
    }
    lines.push("", "## Limitations", "");
    if (!report.limitations.length) {
      lines.push("None reported.");
    } else {
      lines.push("| Code | Path |", "|---|---|");
      for (const limitation of report.limitations) {
        lines.push(
          `| ${markdown(limitation.code)} | ${markdown(limitation.path ?? "(project)")} |`,
        );
      }
    }
    return lines.join("\n");
  }
  throw new Error("Unsupported assessment report format");
}

import type { Finding, ScanReport } from "@arkcompat/contracts";
import validate from "../dist/validator.mjs";

export const maxReportBytes = 8 * 1024 * 1024;
export const maxVisibleRows = 1000;

export function parseReport(text: string): ScanReport {
  if (new TextEncoder().encode(text).byteLength > maxReportBytes)
    throw new Error("Report exceeds 8 MiB limit");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Report must match ArkCompat schema 0.12.0");
  }
  if (!validate(data))
    throw new Error("Report must match ArkCompat schema 0.12.0");
  return data;
}

export function filterFindings(
  findings: Finding[],
  query: string,
  rule: string,
): Finding[] {
  const search = query.trim().toLowerCase();
  return findings.filter(
    (finding) =>
      (rule === "all" || finding.ruleId === rule) &&
      [
        finding.id,
        finding.ruleId,
        finding.status,
        finding.location.path,
        finding.explanation,
        ...finding.evidence.map(
          (e) => `${e.kind}: ${e.value ?? "(unresolved)"}`,
        ),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
  );
}

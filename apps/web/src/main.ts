import type { KnowledgeRecord, ScanReport } from "@arkcompat/contracts";
import {
  filterFindings,
  maxReportBytes,
  maxVisibleRows,
  parseReport,
} from "./model.js";

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing viewer element: ${id}`);
  return value as T;
}
const file = element<HTMLInputElement>("file"),
  search = element<HTMLInputElement>("search"),
  rule = element<HTMLSelectElement>("rule"),
  knowledgeForm = element<HTMLFormElement>("knowledge-form"),
  knowledgePackage = element<HTMLInputElement>("knowledge-package"),
  knowledgeVersion = element<HTMLInputElement>("knowledge-version"),
  knowledgeRelease = element<HTMLInputElement>("knowledge-release"),
  knowledgeRuntime = element<HTMLSelectElement>("knowledge-runtime"),
  knowledgeApiLevel = element<HTMLInputElement>("knowledge-api-level"),
  knowledgeStatus = element<HTMLParagraphElement>("knowledge-status"),
  knowledgeResult = element<HTMLPreElement>("knowledge-result");
let report: ScanReport | null = null;
let generation = 0;
let knowledgeGeneration = 0;
interface KnowledgeResponse {
  status: "unknown";
  snapshotId?: string;
  contentHash?: string;
  totalRecords?: number;
  consideredRecords?: number;
  matches?: KnowledgeRecord[];
  excluded?: { id: string; reasons: string[] }[];
  limitation?: string;
  explanation?: string;
  error?: string;
  loaded?: boolean;
}
function text(id: string, value: string | number) {
  element(id).textContent = String(value);
}
function cleanInput(value: string) {
  return value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}
function looksLikeExactVersion(value: string) {
  return cleanInput(value) && /^\d/.test(value) && !/\s|[<>^~*|]/.test(value);
}
function resetKnowledge() {
  knowledgeGeneration++;
  knowledgeStatus.textContent = "No knowledge query made.";
  knowledgeResult.replaceChildren();
  knowledgeResult.hidden = true;
}
function knowledgeText(response: KnowledgeResponse) {
  const lines: string[] = [
    `Status: ${response.status}`,
    `Snapshot: ${response.snapshotId ?? "unavailable"}`,
    `Content SHA-256: ${response.contentHash ?? "unavailable"}`,
    `Records: ${response.totalRecords ?? 0} total · ${response.consideredRecords ?? 0} considered`,
    "",
  ];
  const matches = Array.isArray(response.matches) ? response.matches : [];
  lines.push(`Matches (${matches.length})`);
  if (matches.length === 0) lines.push("- No reviewed metadata match.");
  for (const match of matches) {
    lines.push(
      `- ${match.id}`,
      `  Source: ${match.source.name} ${match.source.versionRange}`,
      `  Target: ${
        match.target
          ? `${match.target.registry}:${match.target.name} ${match.target.versionRange}`
          : "none recorded"
      }`,
      `  Availability: ${match.availability}`,
      `  Relation: ${match.relation}`,
      `  Profile: HarmonyOS ${match.profile.releaseRange} · ${match.profile.runtime} · API ${match.profile.apiLevel}`,
      `  Included features: ${match.features.included.join(", ") || "none"}`,
      `  Excluded features: ${match.features.excluded.join(", ") || "none"}`,
      `  Review: ${match.review.state}`,
      `  Valid until: ${match.validUntil}`,
    );
    if (match.provenance.length === 0)
      lines.push("  Provenance: none recorded");
    else
      for (const source of match.provenance)
        lines.push(
          `  Provenance: ${source.url}`,
          `    License: ${source.license}`,
          `    Source version: ${source.sourceVersion}`,
          `    Retrieved: ${source.retrievedAt}`,
        );
  }
  const excluded = Array.isArray(response.excluded) ? response.excluded : [];
  lines.push("", `Excluded (${excluded.length})`);
  if (excluded.length === 0) lines.push("- None.");
  for (const record of excluded)
    lines.push(
      `- ${String(record.id)}`,
      `  Reasons: ${record.reasons.map(String).join(", ")}`,
    );
  lines.push(
    "",
    `Limitation: ${response.limitation ?? "No limitation was returned."}`,
  );
  return lines.join("\n");
}
function parseKnowledgeResponse(value: unknown): KnowledgeResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<KnowledgeResponse>;
  if (candidate.status !== "unknown") return null;
  for (const field of [
    "snapshotId",
    "contentHash",
    "limitation",
    "explanation",
    "error",
  ] as const) {
    if (candidate[field] !== undefined && typeof candidate[field] !== "string")
      return null;
  }
  for (const field of ["totalRecords", "consideredRecords"] as const) {
    if (
      candidate[field] !== undefined &&
      (!Number.isSafeInteger(candidate[field]) || candidate[field]! < 0)
    )
      return null;
  }
  if (
    (candidate.matches !== undefined && !Array.isArray(candidate.matches)) ||
    (candidate.excluded !== undefined && !Array.isArray(candidate.excluded))
  )
    return null;
  return candidate as KnowledgeResponse;
}
function render() {
  if (!report) return;
  const findings = filterFindings(report.findings, search.value, rule.value);
  const rows = document.createDocumentFragment();
  for (const finding of findings.slice(0, maxVisibleRows)) {
    const row = document.createElement("tr"),
      identity = document.createElement("td"),
      id = document.createElement("small");
    identity.textContent = finding.ruleId;
    id.textContent = finding.id;
    identity.append(id);
    row.append(identity);
    const status = document.createElement("td"),
      badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = finding.status;
    status.append(badge);
    row.append(status);
    for (const value of [
      `${finding.location.path}:${finding.location.line}:${finding.location.column}`,
      finding.evidence
        .map((e) => `${e.kind}: ${e.value ?? "(unresolved)"}`)
        .join("\n"),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    rows.append(row);
  }
  element("rows").replaceChildren(rows);
  text(
    "count",
    `Showing ${Math.min(findings.length, maxVisibleRows)} of ${findings.length} matching findings (${report.findings.length} total).${findings.length === 0 ? " No inventory findings shown; this does not establish compatibility." : ""}`,
  );
}
function clear() {
  generation++;
  report = null;
  file.value = "";
  search.value = "";
  rule.value = "all";
  element("rows").replaceChildren();
  element("limitations").replaceChildren();
  for (const id of ["target", "coverage", "count", "error"]) text(id, "");
  for (const id of ["dependencies", "references", "api-sites", "total"])
    text(id, 0);
  element("report").hidden = true;
  element("error").hidden = true;
  text("status", "No report loaded.");
  resetKnowledge();
}
file.addEventListener("change", async () => {
  const selected = file.files?.[0];
  if (!selected) return;
  const token = ++generation;
  report = null;
  element("report").hidden = true;
  element("rows").replaceChildren();
  element("error").hidden = true;
  text("status", "Reading local report…");
  try {
    if (selected.size > maxReportBytes)
      throw new Error("Report exceeds 8 MiB limit");
    const imported = parseReport(await selected.text());
    if (token !== generation) return;
    report = imported;
    search.value = "";
    rule.value = "all";
    text(
      "target",
      `HarmonyOS ${report.target.release} · ${report.target.runtime} · API ${report.target.apiLevel ?? "unspecified"} · Scanner ${report.scannerVersion} · Schema ${report.schemaVersion}`,
    );
    for (const [id, count] of [
      ["dependencies", report.dependencies.length],
      ["references", report.references.length],
      ["api-sites", report.apiUsages.length],
      ["total", report.findings.length],
    ] as const)
      text(id, count);
    text(
      "coverage",
      `${report.coverage.dependencyGraph} · ${report.coverage.sourceFiles} source files · ${report.coverage.compatibility}`,
    );
    element("limitations").replaceChildren(
      ...report.coverage.limitations.map((limitation) => {
        const item = document.createElement("li");
        item.textContent = `${limitation.code}${limitation.path ? ` · ${limitation.path}` : ""}`;
        return item;
      }),
    );
    element("report").hidden = false;
    text("status", `Loaded ${selected.name} locally. No upload.`);
    knowledgeRelease.value = report.target.release;
    knowledgeRuntime.value = report.target.runtime;
    if (report.target.apiLevel !== undefined)
      knowledgeApiLevel.value = String(report.target.apiLevel);
    render();
  } catch (error) {
    if (token !== generation) return;
    text(
      "error",
      error instanceof Error && error.message.includes("8 MiB")
        ? "Report exceeds 8 MiB limit. Nothing loaded."
        : "Report must match ArkCompat schema 0.8.0. Nothing loaded.",
    );
    element("error").hidden = false;
    text("status", "Report rejected.");
  }
});
search.addEventListener("input", render);
rule.addEventListener("change", render);
element("reset").addEventListener("click", clear);
knowledgeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = ++knowledgeGeneration;
  knowledgeResult.hidden = true;
  knowledgeResult.replaceChildren();
  const packageName = knowledgePackage.value,
    version = knowledgeVersion.value,
    release = knowledgeRelease.value,
    apiLevel = Number(knowledgeApiLevel.value);
  if (
    !cleanInput(packageName) ||
    !looksLikeExactVersion(version) ||
    !looksLikeExactVersion(release) ||
    !Number.isSafeInteger(apiLevel) ||
    apiLevel < 1
  ) {
    knowledgeStatus.textContent =
      "Knowledge query rejected. Use exact package and version values plus a positive API level.";
    return;
  }
  knowledgeStatus.textContent = "Querying the selected local snapshot…";
  const query = new URLSearchParams({
    package: packageName,
    version,
    release,
    runtime: knowledgeRuntime.value,
    apiLevel: String(apiLevel),
  });
  try {
    const response = await fetch(`/api/knowledge?${query}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    const data = parseKnowledgeResponse(await response.json());
    if (token !== knowledgeGeneration) return;
    if (response.status === 503) {
      knowledgeStatus.textContent =
        data?.explanation ??
        "No knowledge snapshot selected; no verified substitute is available.";
      return;
    }
    if (response.status === 400 || !data) {
      knowledgeStatus.textContent =
        "Knowledge query rejected. Check the exact values and try again.";
      return;
    }
    if (!response.ok) {
      knowledgeStatus.textContent =
        "Local knowledge lookup is unavailable. No mapping was inferred.";
      return;
    }
    const hasMatches = Array.isArray(data.matches) && data.matches.length > 0;
    knowledgeStatus.textContent = hasMatches
      ? "Reviewed metadata matches returned. Status remains unknown; no replacement recommendation was made."
      : "No reviewed metadata match returned. This does not establish a missing port.";
    knowledgeResult.textContent = knowledgeText(data);
    knowledgeResult.hidden = false;
  } catch {
    if (token !== knowledgeGeneration) return;
    knowledgeStatus.textContent =
      "Local knowledge lookup is unavailable. No mapping was inferred.";
  }
});

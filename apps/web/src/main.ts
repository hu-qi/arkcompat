import type { ScanReport } from "@arkcompat/contracts";
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
  rule = element<HTMLSelectElement>("rule");
let report: ScanReport | null = null;
let generation = 0;
function text(id: string, value: string | number) {
  element(id).textContent = String(value);
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

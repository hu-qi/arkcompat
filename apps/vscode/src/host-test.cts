import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import * as vscode from "vscode";
import type { ScanReport } from "@arkcompat/contracts";

/** Real extension-development host test, run only with the authored fixture. */
export async function run() {
  const {
    ARKCOMPAT_TEST_NODE: node,
    ARKCOMPAT_TEST_REPORT: baseline,
    ARKCOMPAT_TEST_PROOF: proof,
    ARKCOMPAT_TEST_INSTALLED_PATH: installedPath,
  } = process.env;
  assert.ok(node && baseline && proof, "Missing isolated host smoke inputs");
  if (installedPath) {
    const extension = vscode.extensions.getExtension(
      "arkcompat-local.arkcompat-local",
    );
    assert.ok(extension, "Missing installed ArkCompat extension");
    assert.equal(extension.extensionPath, installedPath);
  }
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(
    folder && folder.name === "ArkCompatVsCodeProbe",
    "Use only the authored isolated test workspace",
  );
  const config = vscode.workspace.getConfiguration("arkcompat", folder.uri);
  await config.update("nodePath", node, vscode.ConfigurationTarget.Global);
  await config.update("apiLevel", 20, vscode.ConfigurationTarget.Global);
  const report = JSON.parse(readFileSync(baseline, "utf8")) as ScanReport;
  const count = await vscode.commands.executeCommand<number>(
    "arkcompat.scanLocal",
  );
  assert.equal(count, report.findings.length);
  const actual = [];
  for (const finding of report.findings) {
    const uri = vscode.Uri.joinPath(
      folder.uri,
      ...finding.location.path.split("/"),
    );
    const item = vscode.languages
      .getDiagnostics(uri)
      .find(
        (diagnostic) =>
          diagnostic.source === "ArkCompat" && diagnostic.code === finding.id,
      );
    assert.ok(item, `Missing canonical finding ${finding.id}`);
    assert.equal(item.severity, vscode.DiagnosticSeverity.Information);
    assert.equal(item.message, `unknown: ${finding.explanation}`);
    assert.equal(item.range.start.line + 1, finding.location.line);
    assert.equal(item.range.start.character + 1, finding.location.column);
    actual.push({
      id: finding.id,
      status: finding.status,
      location: finding.location,
    });
  }
  const diagnostics = vscode.languages
    .getDiagnostics()
    .flatMap(([, items]) =>
      items.filter((item) => item.source === "ArkCompat"),
    );
  assert.equal(diagnostics.length, report.findings.length);
  writeFileSync(
    proof,
    JSON.stringify(
      {
        version: vscode.version,
        fixture: folder.name,
        ...(installedPath ? { installedVsix: true } : {}),
        count,
        findings: actual,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
}

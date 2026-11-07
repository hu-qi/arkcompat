import { join } from "node:path";
import * as vscode from "vscode";
import type { TargetProfile } from "@arkcompat/contracts";
import { editorLocation, scanWithCli } from "./runner.cjs";

export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection("arkcompat");
  let active: AbortController | undefined;
  const clear = () => {
    active?.abort();
    diagnostics.clear();
  };
  context.subscriptions.push(
    {
      dispose: () => {
        active?.abort();
        diagnostics.dispose();
      },
    },
    vscode.workspace.onDidChangeWorkspaceFolders(clear),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("arkcompat.scanLocal", async () => {
      if (active) {
        void vscode.window.showWarningMessage(
          "ArkCompat is already scanning this window.",
        );
        return;
      }
      const roots = vscode.workspace.workspaceFolders;
      if (!roots || roots.length !== 1 || roots[0]!.uri.scheme !== "file") {
        void vscode.window.showErrorMessage(
          "Open one local workspace folder to scan with ArkCompat.",
        );
        return;
      }
      const root = roots[0]!.uri;
      const configuration = vscode.workspace.getConfiguration(
        "arkcompat",
        root,
      );
      // An executable is a machine choice. Never accept a workspace setting for it.
      const node = configuration.inspect<string>("nodePath")?.globalValue ?? "";
      const runtime = configuration.get<TargetProfile["runtime"]>(
        "runtime",
        "arkts",
      );
      const release = configuration.get<string>("release", "6.0.0");
      const level = configuration.get<number>("apiLevel", 0);
      const target: TargetProfile = {
        os: "HarmonyOS",
        runtime,
        release,
        ...(level === 0 ? {} : { apiLevel: level }),
      };
      const controller = new AbortController();
      active = controller;
      diagnostics.clear();
      try {
        const cli = join(
          context.extensionPath,
          "..",
          "cli",
          "dist",
          "index.js",
        );
        const report = await scanWithCli(
          node,
          cli,
          root.fsPath,
          target,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        const byPath = new Map<string, [vscode.Uri, vscode.Diagnostic[]]>();
        for (const finding of report.findings) {
          const { parts, line, column } = editorLocation(finding.location);
          const uri = vscode.Uri.joinPath(root, ...parts);
          const entry = byPath.get(uri.toString()) ?? [uri, []];
          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(line, column, line, column + 1),
            `unknown: ${finding.explanation}`,
            vscode.DiagnosticSeverity.Information,
          );
          diagnostic.source = "ArkCompat";
          diagnostic.code = finding.id;
          entry[1].push(diagnostic);
          byPath.set(uri.toString(), entry);
        }
        diagnostics.set([...byPath.values()]);
        void vscode.window.showInformationMessage(
          `ArkCompat found ${report.findings.length} inventory items. Compatibility has not been evaluated.`,
        );
        return report.findings.length;
      } catch (error) {
        if (!controller.signal.aborted)
          void vscode.window.showErrorMessage(
            error instanceof Error
              ? `ArkCompat: ${error.message}`
              : "ArkCompat scan failed.",
          );
      } finally {
        active = undefined;
      }
    }),
  );
}

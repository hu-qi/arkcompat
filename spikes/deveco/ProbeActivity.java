package org.arkcompat.probe;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.LogicalPosition;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.OpenFileDescriptor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.ProjectActivity;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.concurrent.TimeUnit;

/** Single-build feasibility probe. Never scans a project other than the configured fixture. */
public final class ProbeActivity implements ProjectActivity {
  @Override
  public Object execute(Project project, Continuation<? super Unit> continuation) {
    runActivity(project);
    return Unit.INSTANCE;
  }

  private void runActivity(Project project) {
    String workspace = System.getProperty("arkcompat.probe.root");
    if (workspace == null || project.getBasePath() == null) return;
    Path sandbox = Path.of(workspace).toAbsolutePath().normalize();
    Path fixture = sandbox.resolve("ArkCompatProbe");
    try {
      if (!Path.of(project.getBasePath()).toRealPath().equals(fixture.toRealPath())) return;
    } catch (IOException ignored) {
      return; // A missing target is outside the opt-in fixture scope.
    }
    ApplicationManager.getApplication().executeOnPooledThread(() -> runScan(project, sandbox, fixture));
  }

  private static void runScan(Project project, Path sandbox, Path fixture) {
    try {
      Path report = Files.createFile(sandbox.resolve("plugin-report.json"));
      Path errorLog = Files.createFile(sandbox.resolve("plugin-stderr.log"));
      Process process = new ProcessBuilder(
          System.getProperty("arkcompat.probe.node"), System.getProperty("arkcompat.probe.cli"),
          "scan", fixture.toString(), "--runtime", "arkts", "--release", "26.0.0", "--api-level", "26")
          .directory(fixture.toFile()).redirectOutput(report.toFile()).redirectError(errorLog.toFile()).start();
      try {
        if (!process.waitFor(30, TimeUnit.SECONDS) || process.exitValue() != 0) {
          fail(sandbox, "scan-process-failed");
          return;
        }
      } finally {
        if (process.isAlive()) process.destroyForcibly();
      }
      if (Files.size(report) > 1024 * 1024) {
        fail(sandbox, "unexpected-fixture-report-size");
        return;
      }
      JsonObject root = JsonParser.parseString(Files.readString(report)).getAsJsonObject();
      for (var value : root.getAsJsonArray("findings")) {
        JsonObject finding = value.getAsJsonObject();
        if (!finding.get("ruleId").getAsString().equals("inventory.api-usage")) continue;
        JsonObject location = finding.getAsJsonObject("location");
        if (!location.get("path").getAsString().equals("main.ts") ||
            !finding.get("status").getAsString().equals("unknown")) {
          fail(sandbox, "unexpected-fixture-finding");
          return;
        }
        ApplicationManager.getApplication().invokeLater(() -> navigate(project, sandbox, fixture, finding, location));
        return;
      }
      fail(sandbox, "fixture-finding-missing");
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      fail(sandbox, "scan-interrupted");
    } catch (Exception e) {
      fail(sandbox, "scan-error-" + e.getClass().getSimpleName());
    }
  }

  private static void navigate(Project project, Path sandbox, Path fixture, JsonObject finding, JsonObject location) {
    try {
      if (project.isDisposed()) { fail(sandbox, "project-disposed"); return; }
      VirtualFile file = LocalFileSystem.getInstance().refreshAndFindFileByPath(fixture.resolve("main.ts").toString());
      int line = location.get("line").getAsInt();
      int column = location.get("column").getAsInt();
      if (file == null || line < 1 || column < 1) { fail(sandbox, "fixture-location-unavailable"); return; }
      Editor editor = FileEditorManager.getInstance(project).openTextEditor(new OpenFileDescriptor(project, file, line - 1, column - 1), true);
      if (editor == null) { fail(sandbox, "editor-unavailable"); return; }
      LogicalPosition actual = editor.getCaretModel().getLogicalPosition();
      if (actual.line != line - 1 || actual.column != column - 1) {
        fail(sandbox, "editor-position-mismatch");
        return;
      }
      Files.writeString(sandbox.resolve("probe-result.txt"),
          "status=unknown\npath=main.ts\nline=" + line + "\ncolumn=" + column + "\nid=" + finding.get("id").getAsString() + "\n", StandardOpenOption.CREATE_NEW);
    } catch (Exception e) {
      fail(sandbox, "editor-error-" + e.getClass().getSimpleName());
    }
  }

  private static void fail(Path sandbox, String reason) {
    try {
      Files.writeString(sandbox.resolve("probe-failure.txt"), reason + "\n", StandardOpenOption.CREATE_NEW);
    } catch (IOException error) {
      throw new IllegalStateException("Unable to retain the feasibility probe failure", error);
    }
  }
}

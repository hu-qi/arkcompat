package org.arkcompat.deveco;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.PathManager;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.LogicalPosition;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.OpenFileDescriptor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.text.StringUtil;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.util.PathUtil;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.jetbrains.annotations.NotNull;

/**
 * One explicit, local scan action. The plugin never scans on startup and never
 * executes the analyzed project's scripts.
 */
public final class ArkCompatScanAction extends AnAction {
  private static final long MAX_REPORT_BYTES = 8L * 1024L * 1024L;
  private static final long MAX_ERROR_BYTES = 512L * 1024L;
  private static final long SCAN_TIMEOUT_SECONDS = 60L;

  @Override
  public @NotNull ActionUpdateThread getActionUpdateThread() {
    return ActionUpdateThread.BGT;
  }

  @Override
  public void update(@NotNull AnActionEvent event) {
    event.getPresentation().setEnabled(event.getProject() != null);
  }

  @Override
  public void actionPerformed(@NotNull AnActionEvent event) {
    Project project = event.getProject();
    if (project == null || project.isDisposed() || project.getBasePath() == null) {
      return;
    }
    Path projectRoot;
    try {
      projectRoot = Path.of(project.getBasePath()).toRealPath();
    } catch (IOException error) {
      showError(project, "ArkCompat could not resolve the current project root.");
      return;
    }
    if (!isInventoryProject(projectRoot)) {
      showError(
          project,
          "No package.json, oh-package.json5 or lockfile was found in the current project.");
      return;
    }

    ApplicationManager.getApplication()
        .executeOnPooledThread(() -> runScan(project, projectRoot));
  }

  private static void runScan(Project project, Path projectRoot) {
    Path workDirectory = null;
    try {
      RuntimePaths runtime = RuntimePaths.resolve();
      Path reportDirectory = reportDirectory();
      Files.createDirectories(reportDirectory);
      workDirectory = Files.createTempDirectory(reportDirectory, "scan-");
      Path report = workDirectory.resolve("report.json");
      Path errorLog = workDirectory.resolve("stderr.log");
      ProcessBuilder builder =
          new ProcessBuilder(
              runtime.node().toString(),
              runtime.cli().toString(),
              "scan",
              projectRoot.toString(),
              "--runtime",
              "arkts",
              "--release",
              "6.0.0",
              "--api-level",
              "20");
      builder.directory(projectRoot.toFile());
      builder.redirectOutput(report.toFile());
      builder.redirectError(errorLog.toFile());
      builder.environment().clear();
      Process process = builder.start();
      boolean finished;
      try {
        finished = process.waitFor(SCAN_TIMEOUT_SECONDS, TimeUnit.SECONDS);
      } finally {
        if (process.isAlive()) process.destroyForcibly();
      }
      if (!finished) {
        showError(project, "ArkCompat scan timed out after 60 seconds.");
        return;
      }
      if (process.exitValue() != 0) {
        showError(project, "ArkCompat local scan failed.");
        return;
      }
      if (!isBoundedRegularFile(report, MAX_REPORT_BYTES)
          || !isBoundedRegularFile(errorLog, MAX_ERROR_BYTES)) {
        showError(project, "ArkCompat rejected an oversized or non-regular scan output.");
        return;
      }
      JsonObject root = JsonParser.parseString(Files.readString(report)).getAsJsonObject();
      String schemaVersion = root.get("schemaVersion").getAsString();
      if (!"0.12.0".equals(schemaVersion)) {
        showError(project, "ArkCompat rejected an unexpected report schema.");
        return;
      }
      Finding first = firstFinding(root, projectRoot);
      Summary summary = summarize(root);
      Notification notification =
          NotificationGroupManager.getInstance()
              .getNotificationGroup("ArkCompat")
              .createNotification(
                  "ArkCompat inventory complete",
                  summary.render(report, schemaVersion),
                  NotificationType.INFORMATION)
              .addAction(
                  NotificationAction.createSimple(
                      "Open report",
                      () -> openFile(project, report, -1, -1)));
      if (first != null) {
        notification.addAction(
            NotificationAction.createSimple(
                "Open first finding",
                () -> openFile(project, first.file(), first.line(), first.column())));
      }
      notification.notify(project);
      writeHostObservation(root, projectRoot, first);
    } catch (RuntimePaths.Unavailable error) {
      showError(project, error.getMessage());
    } catch (IOException error) {
      showError(project, "ArkCompat could not start or read the local scan.");
    } catch (InterruptedException error) {
      Thread.currentThread().interrupt();
      showError(project, "ArkCompat scan was interrupted.");
    } catch (RuntimeException error) {
      showError(project, "ArkCompat rejected malformed local scan output.");
    } finally {
      if (workDirectory != null) {
        try {
          Files.deleteIfExists(workDirectory.resolve("stderr.log"));
        } catch (IOException ignored) {
          // The bounded stderr log is private and should not persist after scanning.
        }
      }
    }
  }

  private static boolean isInventoryProject(Path root) {
    for (String name :
        new String[] {
          "package.json",
          "oh-package.json5",
          "package-lock.json",
          "pnpm-lock.yaml",
          "yarn.lock",
          "oh-package-lock.json5"
        }) {
      if (Files.isRegularFile(root.resolve(name))) return true;
    }
    return false;
  }

  private static boolean isBoundedRegularFile(Path path, long maximum) throws IOException {
    return Files.isRegularFile(path) && !Files.isSymbolicLink(path) && Files.size(path) <= maximum;
  }

  private static Path reportDirectory() throws IOException {
    String configured = System.getProperty("arkcompat.deveco.report-root");
    if (configured != null && !configured.isBlank()) {
      return Path.of(configured).toRealPath().resolve("reports");
    }
    return Path.of(PathManager.getSystemPath(), "arkcompat").toAbsolutePath();
  }

  private static Finding firstFinding(JsonObject root, Path projectRoot) throws IOException {
    JsonArray findings = root.getAsJsonArray("findings");
    for (JsonElement element : findings) {
      JsonObject finding = element.getAsJsonObject();
      if (!"unknown".equals(finding.get("status").getAsString())) continue;
      JsonObject location = finding.getAsJsonObject("location");
      String relative = location.get("path").getAsString();
      Path resolved = projectRoot.resolve(relative).normalize();
      if (!resolved.startsWith(projectRoot) || resolved.equals(projectRoot)
          || !Files.isRegularFile(resolved) || Files.isSymbolicLink(resolved)) continue;
      return new Finding(
          resolved, location.get("line").getAsInt(), location.get("column").getAsInt());
    }
    return null;
  }

  private static Summary summarize(JsonObject root) {
    int total = 0;
    int unknown = 0;
    int other = 0;
    for (JsonElement element : root.getAsJsonArray("findings")) {
      JsonObject finding = element.getAsJsonObject();
      total++;
      if ("unknown".equals(finding.get("status").getAsString())) unknown++;
      else other++;
    }
    return new Summary(total, unknown, other);
  }

  private static void openFile(Project project, Path path, int line, int column) {
    if (project.isDisposed()) return;
    VirtualFile file =
        LocalFileSystem.getInstance().refreshAndFindFileByPath(path.toAbsolutePath().toString());
    if (file == null) {
      showError(project, "ArkCompat could not open the local report location.");
      return;
    }
    OpenFileDescriptor descriptor =
        line > 0 && column > 0
            ? new OpenFileDescriptor(project, file, line - 1, column - 1)
            : new OpenFileDescriptor(project, file);
    Editor editor = FileEditorManager.getInstance(project).openTextEditor(descriptor, true);
    if (editor != null && line > 0 && column > 0) {
      LogicalPosition expected = new LogicalPosition(line - 1, column - 1);
      editor.getCaretModel().moveToLogicalPosition(expected);
    }
  }

  private static void writeHostObservation(JsonObject root, Path projectRoot, Finding first) {
    String observationRoot = System.getProperty("arkcompat.deveco.observation-root");
    if (observationRoot == null || first == null) return;
    try {
      JsonArray ids = new JsonArray();
      for (JsonElement element : root.getAsJsonArray("findings"))
        ids.add(element.getAsJsonObject().get("id").getAsString());
      JsonObject observation = new JsonObject();
      observation.addProperty("schemaVersion", root.get("schemaVersion").getAsString());
      observation.addProperty("findingCount", ids.size());
      observation.add("findingIds", ids);
      observation.addProperty(
          "firstFindingPath", projectRoot.relativize(first.file()).toString());
      observation.addProperty("firstFindingLine", first.line());
      observation.addProperty("firstFindingColumn", first.column());
      observation.addProperty("firstFindingStatus", "unknown");
      Path rootPath = Path.of(observationRoot).toRealPath();
      Files.writeString(rootPath.resolve("deveco-action-observation.json"),
          observation.toString() + "\n", StandardCharsets.UTF_8);
    } catch (IOException | RuntimeException ignored) {
      // The optional host observation must not affect the user-facing scan.
    }
  }

  private static void showError(Project project, String message) {
    NotificationGroupManager.getInstance()
        .getNotificationGroup("ArkCompat")
        .createNotification("ArkCompat", message, NotificationType.ERROR)
        .notify(project);
  }

  private record Finding(Path file, int line, int column) {}

  private record Summary(int total, int unknown, int other) {
    private String render(Path report, String schemaVersion) {
      return StringUtil.join(
          new String[] {
            total + " canonical findings",
            unknown + " unknown",
            other + " other",
            "Schema " + schemaVersion,
            "Report " + report
          },
          " · ");
    }
  }

  private record RuntimePaths(Path node, Path cli) {
    private static RuntimePaths resolve() throws Unavailable {
      Path home = Path.of(PathManager.getHomePath());
      Path node = home.resolve("tools/node/bin/node");
      if (!Files.isRegularFile(node)) throw new Unavailable("DevEco's bundled Node runtime is unavailable.");
      Path jar = Path.of(PathUtil.getJarPathForClass(ArkCompatScanAction.class));
      Path cli = jar.getParent().resolve("runtime/dist/index.js");
      if (!Files.isRegularFile(cli))
        throw new Unavailable("The plugin's portable ArkCompat CLI is unavailable.");
      return new RuntimePaths(node, cli);
    }

    private static final class Unavailable extends Exception {
      private static final long serialVersionUID = 1L;

      private Unavailable(String message) {
        super(message);
      }
    }
  }
}

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import {
  access,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatReport, scanProject } from "@arkcompat/core";
import type { TargetProfile } from "@arkcompat/contracts";

const target: TargetProfile = {
  os: "HarmonyOS",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: 20,
};
const roots: string[] = [];

async function project(manifest: unknown = {}) {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-security-"));
  roots.push(root);
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  return root;
}

function cli(projectPath: string, command = "scan") {
  return spawnSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      command,
      projectPath,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("scanner security matrix", () => {
  it("normalizes absolute and dot-dot project roots while keeping report paths relative", async () => {
    const root = await project({ dependencies: { sample: "^1" } });
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "main.ts"), 'import "sample";');

    const fromAbsolute = await scanProject(root, target);
    const fromDotDot = await scanProject(join(root, "nested", ".."), target);

    expect({
      equal: JSON.stringify(fromAbsolute) === JSON.stringify(fromDotDot),
      rootLeaked: JSON.stringify(fromDotDot).includes(root),
      paths: fromDotDot.references.map((reference) => reference.location.path),
    }).toEqual({
      equal: true,
      rootLeaked: false,
      paths: ["main.ts"],
    });
  });

  it("treats an explicitly selected root symlink as the scan root and keeps internal links skipped", async () => {
    const root = await project();
    const outside = await project();
    await writeFile(join(root, "main.ts"), 'import "inside";');
    await writeFile(join(outside, "external.ts"), 'import "outside-secret";');
    await symlink(join(outside, "external.ts"), join(root, "linked.ts"));
    const selected = join(dirname(root), `${root.split("/").at(-1)}-link`);
    await symlink(root, selected);
    roots.push(selected);

    const report = await scanProject(selected, target);

    expect({
      references: report.references.map((reference) => reference.specifier),
      symlink: report.coverage.limitations.some(
        (limitation) =>
          limitation.code === "symlink-skipped" &&
          limitation.path === "linked.ts",
      ),
      rootLeaked: JSON.stringify(report).includes(root),
    }).toEqual({
      references: ["inside"],
      symlink: true,
      rootLeaked: false,
    });
  });

  it("skips a Unix socket as a special file without opening it", async () => {
    const root = await project();
    const socketPath = join(root, "scanner.sock");
    const server = createServer();
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, resolve);
    });

    try {
      const report = await scanProject(root, target);
      expect(report.coverage.limitations).toContainEqual({
        code: "special-file-skipped",
        path: "scanner.sock",
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("fails closed when the scan entry budget is exceeded", async () => {
    const root = await project();
    for (let start = 0; start < 10_000; start += 500) {
      await Promise.all(
        Array.from({ length: 500 }, (_, offset) =>
          writeFile(
            join(root, `${String(start + offset).padStart(5, "0")}.txt`),
            "",
          ),
        ),
      );
    }

    await expect(scanProject(root, target)).rejects.toThrow(
      /entry limit exceeded \(10000\)/,
    );
  }, 30_000);

  it("fails closed when the cooperative scan deadline is already exhausted", async () => {
    const root = await project({ dependencies: { sample: "^1" } });

    await expect(scanProject(root, target, { timeoutMs: 0 })).rejects.toThrow(
      /Scan time limit exceeded \(0 ms\)/,
    );
  });

  it("fails closed through the CLI when its scan deadline is zero", async () => {
    const root = await project({ dependencies: { sample: "^1" } });

    const result = spawnSync(
      process.execPath,
      [
        "apps/cli/dist/index.js",
        "scan",
        root,
        "--runtime",
        "arkts",
        "--release",
        "6.0.0",
        "--api-level",
        "20",
        "--timeout-ms",
        "0",
      ],
      { encoding: "utf8" },
    );

    expect({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr.trim(),
    }).toEqual({
      status: 1,
      stdout: "",
      stderr: "Scan time limit exceeded (0 ms)",
    });
  });

  it("fails closed at the per-file, aggregate and directory-depth limits", async () => {
    const oversized = await project();
    await writeFile(
      join(oversized, "oversized.ts"),
      " ".repeat(1024 * 1024 + 1),
    );
    await expect(scanProject(oversized, target)).rejects.toThrow(
      /within scan limits/,
    );

    const aggregate = await project();
    const block = Buffer.alloc(1024 * 1024, 0x20);
    block[0] = 0x2f;
    block[1] = 0x2f;
    block[block.length - 1] = 0x0a;
    for (let index = 0; index < 33; index += 1)
      await writeFile(
        join(aggregate, `${String(index).padStart(2, "0")}.ts`),
        block,
      );
    await expect(scanProject(aggregate, target)).rejects.toThrow(
      /within scan limits/,
    );

    const deep = await project();
    await mkdir(join(deep, ...Array.from({ length: 65 }, () => "d")), {
      recursive: true,
    });
    await expect(scanProject(deep, target)).rejects.toThrow(
      /depth limit exceeded \(64\)/,
    );
  }, 30_000);

  it("fails closed on an overlong workspace selection without echoing it", async () => {
    const pattern = "a".repeat(1025);
    const root = await project({
      private: true,
      workspaces: [pattern],
    });

    const report = await scanProject(root, target);

    expect(report.coverage.limitations).toContainEqual({
      code: "npm-workspace-pattern-unsafe",
    });
    expect(JSON.stringify(report)).not.toContain(pattern);
  });

  it("keeps hostile Markdown fields inert while retaining their machine-readable values", async () => {
    const root = await project({ dependencies: { sample: "^1" } });
    const report = await scanProject(root, target);
    report.findings[0]!.evidence[0]!.value =
      "<script>|token=fixture-token</script>\n\u001b";
    report.findings[0]!.explanation =
      "<img src=x onerror=alert(1)> `[open](https://bad.invalid)`";
    report.coverage.limitations.push({
      code: "<style>|token=fixture-token</style>\n\u0000",
      path: "[path](https://bad.invalid)",
    });

    const markdown = formatReport(report, "markdown");
    const sarif = JSON.parse(formatReport(report, "sarif"));

    expect({
      markdownHtml: /<(script|img|style)>/.test(markdown),
      markdownControls: /[\u0000\u001b]/.test(markdown),
      markdownEscaped:
        markdown.includes("&lt;script&gt;") &&
        markdown.includes("\\[open\\]\\("),
      sarifCanonical:
        sarif.runs[0].results[0].properties.evidence[0].value ===
        report.findings[0]!.evidence[0]!.value,
    }).toEqual({
      markdownHtml: false,
      markdownControls: false,
      markdownEscaped: true,
      sarifCanonical: true,
    });
  });

  it("does not execute lifecycle scripts while preserving inventory unknowns", async () => {
    const root = await project({
      dependencies: { sample: "^1" },
      scripts: {
        preinstall:
          "node -e \"require('node:fs').writeFileSync('lifecycle-ran','x')\"",
        install:
          "node -e \"require('node:fs').writeFileSync('lifecycle-ran','x')\"",
        postinstall:
          "node -e \"require('node:fs').writeFileSync('lifecycle-ran','x')\"",
        prepare:
          "node -e \"require('node:fs').writeFileSync('lifecycle-ran','x')\"",
      },
    });
    await writeFile(join(root, "main.ts"), 'import "sample";');

    const report = await scanProject(root, target);

    expect({
      statuses: report.findings.map((finding) => finding.status),
      markerCreated: await access(join(root, "lifecycle-ran")).then(
        () => true,
        () => false,
      ),
    }).toEqual({
      statuses: ["unknown", "unknown"],
      markerCreated: false,
    });
  });

  it("sanitizes filesystem failures at the CLI boundary", async () => {
    const root = await project();
    const missing = join(root, "private", "fixture-secret");

    const result = cli(missing);

    expect({
      status: result.status,
      stdout: result.stdout,
      stableCode: result.stderr.trim() === "Filesystem error: ENOENT",
      rootLeaked: result.stderr.includes(root),
      secretLeaked: result.stderr.includes("fixture-secret"),
    }).toEqual({
      status: 1,
      stdout: "",
      stableCode: true,
      rootLeaked: false,
      secretLeaked: false,
    });
  });

  it("rejects corrupt manifests through a stable CLI diagnostic without echoing source", async () => {
    const root = await project();
    const secret = "fixture-token";
    const malformed = `{"dependencies":{"secret":"${secret}"`;
    await writeFile(join(root, "package.json"), malformed);

    const result = cli(root);

    expect({
      status: result.status,
      stdout: result.stdout,
      stableCode: result.stderr.trim() === "Invalid JSON in package.json",
      rootLeaked: result.stderr.includes(root),
      secretLeaked: result.stderr.includes(secret),
    }).toEqual({
      status: 1,
      stdout: "",
      stableCode: true,
      rootLeaked: false,
      secretLeaked: false,
    });
  });

  it("redacts credential-bearing URLs from canonical and rendered reports", async () => {
    const root = await project({
      dependencies: {
        remote:
          "https://fixture-user:fixture-password@example.invalid/pkg?token=fixture-token",
      },
    });
    await writeFile(
      join(root, "main.ts"),
      'import "https://example.invalid/pkg?token=fixture-token";',
    );

    const report = await scanProject(root, target);
    const rendered = [
      JSON.stringify(report),
      formatReport(report, "markdown"),
      formatReport(report, "sarif"),
    ].join("\n");

    expect(rendered).not.toMatch(
      /fixture-user|fixture-password|fixture-token|example\.invalid/,
    );
  });
});

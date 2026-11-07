import { spawnSync, execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-action-"));
  roots.push(root);
  const workspace = join(root, "workspace");
  const runnerTemp = join(root, "runner");
  const output = join(root, "github-output");
  await mkdir(workspace);
  await mkdir(runnerTemp);
  await writeFile(
    join(workspace, "package.json"),
    JSON.stringify({
      private: true,
      scripts: { postinstall: "touch SHOULD_NOT_EXECUTE" },
    }),
  );
  await writeFile(
    join(workspace, "main.ts"),
    'import * as fs from "node:fs"; fs.readFile("PRIVATE_ARGUMENT"); throw new Error("MUST_NOT_RUN");',
  );
  await writeFile(output, "");
  return { root, workspace, runnerTemp, output };
}
function run(
  f: Awaited<ReturnType<typeof fixture>>,
  overrides: NodeJS.ProcessEnv = {},
) {
  return spawnSync(
    process.execPath,
    [resolve(".github/actions/arkcompat-scan/run.mjs")],
    {
      cwd: f.workspace,
      encoding: "utf8",
      timeout: 5000,
      env: {
        ...process.env,
        GITHUB_WORKSPACE: f.workspace,
        RUNNER_TEMP: f.runnerTemp,
        GITHUB_OUTPUT: f.output,
        ARKCOMPAT_SCAN_PROJECT: ".",
        ARKCOMPAT_SCAN_RUNTIME: "arkts",
        ARKCOMPAT_SCAN_RELEASE: "6.0.0",
        ARKCOMPAT_SCAN_API_LEVEL: "20",
        ...overrides,
      },
    },
  );
}
it("writes byte-identical canonical CLI output to a runner file without logging or executing input", async () => {
  const f = await fixture();
  const action = run(f);
  expect({
    status: action.status,
    stdout: action.stdout,
    stderr: action.stderr,
  }).toEqual({ status: 0, stdout: "", stderr: "" });
  const output = await readFile(f.output, "utf8");
  expect(output).toMatch(/^report-path=.*\/report\.json\n$/);
  const report = await readFile(
    output.trim().slice("report-path=".length),
    "utf8",
  );
  const cli = execFileSync(
    process.execPath,
    [
      "apps/cli/dist/index.js",
      "scan",
      f.workspace,
      "--runtime",
      "arkts",
      "--release",
      "6.0.0",
      "--api-level",
      "20",
    ],
    { encoding: "utf8" },
  );
  expect({
    bytes: report,
    privateArgument: report.includes("PRIVATE_ARGUMENT"),
    snapshots: JSON.parse(report).snapshots,
  }).toEqual({
    bytes: cli,
    privateArgument: false,
    snapshots: { rules: "none", knowledge: "none" },
  });
  await expect(
    access(join(f.workspace, "SHOULD_NOT_EXECUTE")),
  ).rejects.toThrow();
});
it.each([
  "../outside",
  "/tmp",
  "C:\\private",
  "\\\\host\\share",
  "sub/../other",
  "sub\\child",
  "sub\nchild",
])(
  "rejects unsafe project paths without declaring an output",
  async (project) => {
    const f = await fixture();
    const r = run(f, { ARKCOMPAT_SCAN_PROJECT: project });
    expect({
      status: r.status,
      stdout: r.stdout,
      output: await readFile(f.output, "utf8"),
      diagnostic: r.stderr.trim(),
    }).toEqual({
      status: 1,
      stdout: "",
      output: "",
      diagnostic:
        "ArkCompat: project must be a relative directory inside the workspace.",
    });
  },
);
it("rejects symlink escape and permits an ordinary nested project", async () => {
  const f = await fixture();
  const outside = await fixture();
  await symlink(outside.workspace, join(f.workspace, "escape"), "dir");
  expect(run(f, { ARKCOMPAT_SCAN_PROJECT: "escape" }).status).toBe(1);
  const nested = join(f.workspace, "nested");
  await mkdir(nested);
  await writeFile(join(nested, "package.json"), "{}");
  expect(run(f, { ARKCOMPAT_SCAN_PROJECT: "nested" }).status).toBe(0);
});
it("does not log raw parser data or publish output for invalid scan/profile input", async () => {
  const f = await fixture();
  const profile = run(f, {
    ARKCOMPAT_SCAN_RELEASE: "6.0.0; touch PRIVATE_PAYLOAD",
  });
  await writeFile(join(f.workspace, "package.json"), "{PRIVATE_PAYLOAD");
  const malformed = run(f);
  for (const r of [profile, malformed])
    expect({
      status: r.status,
      stdout: r.stdout,
      leak: r.stderr.includes("PRIVATE_PAYLOAD"),
    }).toEqual({ status: 1, stdout: "", leak: false });
  expect(await readFile(f.output, "utf8")).toBe("");
});
it("requires runner context rather than writing to an implicit working directory", async () => {
  const f = await fixture();
  const r = run(f, { GITHUB_OUTPUT: "" });
  expect({
    status: r.status,
    output: await readFile(f.output, "utf8"),
  }).toEqual({ status: 1, output: "" });
});

import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { copyFile, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function startPackagedViewer() {
  const root = await mkdtemp(join(tmpdir(), "arkcompat-web-package-"));
  roots.push(root);
  await cp("apps/web/dist", join(root, "dist"), { recursive: true });
  await copyFile(
    join(root, "dist/server.bundle.mjs"),
    join(root, "server.mjs"),
  );
  await copyFile(
    join(root, "dist/knowledge.schema.json"),
    join(root, "knowledge.schema.json"),
  );
  const child = spawn(
    process.execPath,
    [join(root, "server.mjs"), "--port", "0"],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const exit = once(child, "exit").then(([code]) => {
    throw new Error(`Packaged viewer exited: ${code}`);
  });
  const ready = new Promise<string>((resolve, reject) => {
    child.once("error", reject);
    let text = "";
    child.stdout!.on("data", (chunk) => {
      text += chunk;
      const url = /http:\/\/127\.0\.0\.1:\d+/.exec(text)?.[0];
      if (url) resolve(url);
    });
  });
  const base = await Promise.race([ready, exit]);
  return { child, base };
}

it("ships a self-contained web server that runs outside the workspace", async () => {
  execFileSync(process.execPath, ["apps/web/build.mjs"], { stdio: "ignore" });
  const bundle = await readFile("apps/web/dist/server.bundle.mjs", "utf8");
  const { child, base } = await startPackagedViewer();
  try {
    const page = await fetch(base + "/");
    const status = await fetch(base + "/api/knowledge/status");
    expect({
      bareImports: /from\s*["']@arkcompat\//.test(bundle),
      pageStatus: page.status,
      pageHasViewer: (await page.text()).includes("ArkCompat"),
      knowledgeStatus: status.status,
      knowledgeBody: await status.json(),
    }).toMatchObject({
      bareImports: false,
      pageStatus: 200,
      pageHasViewer: true,
      knowledgeStatus: 200,
      knowledgeBody: { status: "unknown", loaded: false },
    });
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, "exit");
    }
  }
});

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanProject } from "@arkcompat/core";
import type { KnowledgeSnapshot } from "@arkcompat/contracts";
import {
  filterFindings,
  parseReport,
  maxReportBytes,
  maxVisibleRows,
} from "../apps/web/src/model.js";

it("accepts the canonical report without changing identity, status or evidence", async () => {
  const report = await scanProject("fixtures/developer/source-api", {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
  });
  expect(parseReport(JSON.stringify(report))).toEqual(report);
});
it.each(["not JSON", "null", "{}", '{"schemaVersion":"99.0.0"}'])(
  "rejects malformed/version-mismatched imports: %s",
  (text) => {
    expect(() => parseReport(text)).toThrow(/schema 0.11.0/);
  },
);
it("rejects over-limit input before parsing", () => {
  expect(() => parseReport(" ".repeat(maxReportBytes + 1))).toThrow(/8 MiB/);
});
it.each(["0.5.0", "0.6.0", "0.7.0"])(
  "rejects historical schema %s after the OHPM graph migration",
  async (version) => {
    const report = await scanProject("fixtures/developer/yarn-berry-graph", {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
    });
    Reflect.set(report, "schemaVersion", version);
    expect(() => parseReport(JSON.stringify(report))).toThrow(/schema 0.11.0/);
  },
);
it("measures the report cap in UTF-8 bytes rather than character count", () => {
  expect(() =>
    parseReport("雪".repeat(Math.ceil(maxReportBytes / 3) + 1)),
  ).toThrow(/8 MiB/);
});
it("rejects structurally forged compatibility conclusions", async () => {
  const r = await scanProject("fixtures/developer/source-api", {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
  });
  Reflect.set(r.findings[0]!, "status", "verified-compatible");
  expect(() => parseReport(JSON.stringify(r))).toThrow(/schema 0.11.0/);
});
it("filters canonical rules and literal search text without mutating findings", async () => {
  const r = await scanProject("fixtures/developer/source-api", {
    os: "HarmonyOS",
    release: "6.0.0",
    runtime: "arkts",
  });
  const before = JSON.stringify(r);
  expect({
    calls: filterFindings(r.findings, "", "inventory.api-usage").map(
      (f) => f.id,
    ),
    found: filterFindings(r.findings, r.findings[0]!.id.toUpperCase(), "all")
      .length,
    literal: filterFindings(r.findings, "[", "all").length,
    untouched: JSON.stringify(r),
    cap: maxVisibleRows,
  }).toEqual({
    calls: r.findings
      .filter((f) => f.ruleId === "inventory.api-usage")
      .map((f) => f.id),
    found: 1,
    literal: 4,
    untouched: before,
    cap: 1000,
  });
});

async function startViewer(extra: string[] = []) {
  const viewerProcess = spawn(
    process.execPath,
    ["apps/web/server.mjs", "--port", "0", ...extra],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const exit = once(viewerProcess, "exit").then(([code]) => {
    throw new Error(`Viewer server exited: ${code}`);
  });
  const ready = new Promise<string>((resolve, reject) => {
    viewerProcess.once("error", reject);
    let text = "";
    viewerProcess.stdout!.on("data", (chunk) => {
      text += chunk;
      const url = /http:\/\/127\.0\.0\.1:\d+/.exec(text)?.[0];
      if (url) resolve(url);
    });
  });
  const base = await Promise.race([ready, exit]);
  return { process: viewerProcess, base };
}
async function stopViewer(process: ReturnType<typeof spawn>) {
  if (process.exitCode === null) {
    process.kill();
    await once(process, "exit");
  }
}
let server: ReturnType<typeof spawn>;
let base: string;
beforeAll(async () => {
  ({ process: server, base } = await startViewer());
});
afterAll(async () => {
  if (server) await stopViewer(server);
});

async function knowledgeSnapshot(reviewed: boolean) {
  const snapshot = JSON.parse(
    await readFile("fixtures/developer/knowledge/snapshot.json", "utf8"),
  ) as KnowledgeSnapshot;
  if (reviewed)
    snapshot.records[0]!.review = {
      state: "reviewed",
      reviewer: "developer-fixture-author",
      reviewedAt: snapshot.generatedAt,
    };
  const root = await mkdtemp(join(tmpdir(), "arkcompat-web-knowledge-"));
  const path = join(root, "snapshot.json");
  await writeFile(path, JSON.stringify(snapshot));
  return { root, path };
}
const knowledgeAsOf = "2026-11-07T00:00:00Z";
const knowledgeQuery = new URLSearchParams({
  package: "synthetic-source",
  version: "1.2.0",
  release: "6.0.0",
  runtime: "arkts",
  apiLevel: "20",
});

it("reports unavailable knowledge without inventing a mapping in Web mode", async () => {
  const status = await fetch(base + "/api/knowledge/status");
  const query = await fetch(base + "/api/knowledge?" + knowledgeQuery);
  expect({
    statusStatus: status.status,
    statusBody: await status.json(),
    queryStatus: query.status,
    queryBody: await query.json(),
  }).toEqual({
    statusStatus: 200,
    statusBody: {
      status: "unknown",
      loaded: false,
      limitation:
        "No knowledge snapshot selected; no verified substitute is available.",
    },
    queryStatus: 503,
    queryBody: {
      status: "unknown",
      loaded: false,
      mapping: null,
      matches: [],
      excluded: [],
      explanation:
        "No knowledge snapshot selected; no verified substitute is available.",
    },
  });
});

it("queries an operator-selected reviewed snapshot without promotion", async () => {
  const knowledge = await knowledgeSnapshot(true);
  const viewer = await startViewer([
    "--knowledge-snapshot",
    knowledge.path,
    "--knowledge-as-of",
    knowledgeAsOf,
  ]);
  try {
    const status = await fetch(viewer.base + "/api/knowledge/status");
    const query = await fetch(viewer.base + "/api/knowledge?" + knowledgeQuery);
    const snapshot = JSON.parse(
      await readFile(knowledge.path, "utf8"),
    ) as KnowledgeSnapshot;
    expect({
      statusStatus: status.status,
      statusBody: await status.json(),
      queryStatus: query.status,
      queryBody: await query.json(),
    }).toMatchObject({
      statusStatus: 200,
      statusBody: {
        status: "unknown",
        loaded: true,
      },
      queryStatus: 200,
      queryBody: {
        status: "unknown",
        snapshotId: snapshot.snapshotId,
        totalRecords: 1,
        consideredRecords: 1,
        matches: snapshot.records,
        excluded: [],
        limitation:
          "Metadata matches only; provenance, review identity and compatibility are not verified. No recommendation is made.",
      },
    });
  } finally {
    await stopViewer(viewer.process);
    await rm(knowledge.root, { recursive: true, force: true });
  }
});

it("withholds candidate records in Web responses", async () => {
  const knowledge = await knowledgeSnapshot(false);
  const viewer = await startViewer([
    "--knowledge-snapshot",
    knowledge.path,
    "--knowledge-as-of",
    knowledgeAsOf,
  ]);
  try {
    const response = await fetch(
      viewer.base + "/api/knowledge?" + knowledgeQuery,
    );
    expect(await response.json()).toMatchObject({
      status: "unknown",
      matches: [],
      excluded: [{ id: "synthetic.mapping", reasons: ["not-reviewed"] }],
    });
  } finally {
    await stopViewer(viewer.process);
    await rm(knowledge.root, { recursive: true, force: true });
  }
});

it("rejects incomplete or ambiguous Web knowledge queries", async () => {
  const knowledge = await knowledgeSnapshot(true);
  const viewer = await startViewer([
    "--knowledge-snapshot",
    knowledge.path,
    "--knowledge-as-of",
    knowledgeAsOf,
  ]);
  try {
    for (const raw of [
      "package=synthetic-source",
      "package=synthetic-source&version=%5E1.0.0&release=6.0.0&runtime=arkts&apiLevel=20",
      "package=synthetic-source&version=1.2.0&release=6.0.0&runtime=arkts&apiLevel=20&extra=x",
      "package=a&package=b&version=1.2.0&release=6.0.0&runtime=arkts&apiLevel=20",
    ]) {
      const response = await fetch(viewer.base + "/api/knowledge?" + raw);
      expect({
        status: response.status,
        reflected: (await response.text()).includes("synthetic-source"),
      }).toEqual({ status: 400, reflected: false });
    }
  } finally {
    await stopViewer(viewer.process);
    await rm(knowledge.root, { recursive: true, force: true });
  }
});

it("rejects invalid knowledge server startup without leaking its path", () => {
  const path = "/private/tmp/PRIVATE_WEB_KNOWLEDGE.json";
  const result = spawnSync(
    process.execPath,
    [
      "apps/web/server.mjs",
      "--port",
      "0",
      "--knowledge-snapshot",
      path,
      "--knowledge-as-of",
      knowledgeAsOf,
    ],
    { encoding: "utf8" },
  );
  expect({
    status: result.status,
    stdout: result.stdout,
    leaked: result.stderr.includes(path),
  }).toEqual({ status: 1, stdout: "", leaked: false });
});

it("serves only loopback assets with restrictive browser policies", async () => {
  const r = await fetch(base);
  const html = await r.text();
  expect({
    status: r.status,
    csp: r.headers.get("content-security-policy"),
    type: r.headers.get("content-type"),
    fileImport: html.includes('type="file"'),
    knowledgeLookup: html.includes('id="knowledge-form"'),
    rawNetworkScript: /https?:\/\//.test(html),
  }).toEqual({
    status: 200,
    csp: "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    type: "text/html; charset=utf-8",
    fileImport: true,
    knowledgeLookup: true,
    rawNetworkScript: false,
  });
});
it.each(["/missing", "/package.json", "/..%2fpackage.json"])(
  "rejects non-asset server paths: %s",
  async (path) => {
    expect((await fetch(base + path)).status).toBe(404);
  },
);
it("rejects POST and serves HEAD without body", async () => {
  expect({
    post: (await fetch(base, { method: "POST", body: "{}" })).status,
    head: await (await fetch(base, { method: "HEAD" })).text(),
  }).toEqual({ post: 405, head: "" });
});
it("produces a standalone bundle without runtime code generation", async () => {
  const bundle = await readFile("apps/web/dist/app.js", "utf8");
  expect(/new Function\(|eval\(/.test(bundle)).toBe(false);
});

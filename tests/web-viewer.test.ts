import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { scanProject } from "@arkcompat/core";
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
    expect(() => parseReport(text)).toThrow(/schema 0.7.0/);
  },
);
it("rejects over-limit input before parsing", () => {
  expect(() => parseReport(" ".repeat(maxReportBytes + 1))).toThrow(/8 MiB/);
});
it.each(["0.5.0", "0.6.0"])(
  "rejects historical schema %s after the OHPM graph migration",
  async (version) => {
    const report = await scanProject("fixtures/developer/yarn-berry-graph", {
      os: "HarmonyOS",
      release: "6.0.0",
      runtime: "arkts",
    });
    Reflect.set(report, "schemaVersion", version);
    expect(() => parseReport(JSON.stringify(report))).toThrow(/schema 0.7.0/);
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
  expect(() => parseReport(JSON.stringify(r))).toThrow(/schema 0.7.0/);
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

let server: ReturnType<typeof spawn>;
let base: string;
beforeAll(async () => {
  server = spawn(process.execPath, ["apps/web/server.mjs", "--port", "0"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exit = once(server, "exit").then(([code]) => {
    throw new Error(`Viewer server exited: ${code}`);
  });
  const ready = new Promise<string>((resolve, reject) => {
    server.once("error", reject);
    let text = "";
    server.stdout!.on("data", (chunk) => {
      text += chunk;
      const url = /http:\/\/127\.0\.0\.1:\d+/.exec(text)?.[0];
      if (url) resolve(url);
    });
  });
  base = await Promise.race([ready, exit]);
});
afterAll(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
});
it("serves only loopback assets with restrictive browser policies", async () => {
  const r = await fetch(base);
  const html = await r.text();
  expect({
    status: r.status,
    csp: r.headers.get("content-security-policy"),
    type: r.headers.get("content-type"),
    fileImport: html.includes('type="file"'),
    rawNetworkScript: /https?:\/\//.test(html),
  }).toEqual({
    status: 200,
    csp: "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    type: "text/html; charset=utf-8",
    fileImport: true,
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

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadKnowledgeStore } from "@arkcompat/knowledge";

const usage =
  "Usage: viewer [--port 0..65535] [--knowledge-snapshot <file> --knowledge-as-of <timestamp>]";
function startup(args) {
  let port = 4318;
  let snapshot;
  let asOf;
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error(usage);
    seen.add(flag);
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(usage);
    if (flag === "--port") port = /^\d+$/.test(value) ? Number(value) : NaN;
    else if (flag === "--knowledge-snapshot") snapshot = value;
    else if (flag === "--knowledge-as-of") asOf = value;
    else throw new Error(usage);
  }
  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535 ||
    Boolean(snapshot) !== Boolean(asOf)
  )
    throw new Error(usage);
  return { port, snapshot, asOf };
}

function knowledgeQuery(url) {
  const expected = ["package", "version", "release", "runtime", "apiLevel"];
  if (
    url.searchParams.size !== expected.length ||
    expected.some(
      (name) =>
        !url.searchParams.has(name) ||
        url.searchParams.getAll(name).length !== 1,
    )
  )
    throw new Error();
  const apiLevel = url.searchParams.get("apiLevel");
  const runtime = url.searchParams.get("runtime");
  if (
    !apiLevel ||
    !/^\d+$/.test(apiLevel) ||
    !Number.isSafeInteger(Number(apiLevel)) ||
    Number(apiLevel) < 1 ||
    !["arkts", "arkweb", "react-native"].includes(runtime)
  )
    throw new Error();
  return {
    package: url.searchParams.get("package"),
    version: url.searchParams.get("version"),
    target: {
      os: "HarmonyOS",
      release: url.searchParams.get("release"),
      runtime,
      apiLevel: Number(apiLevel),
    },
  };
}

async function main() {
  const configuration = startup(process.argv.slice(2));
  const knowledge =
    configuration.snapshot && configuration.asOf
      ? await loadKnowledgeStore(configuration.snapshot, configuration.asOf)
      : undefined;
  const assets = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
    ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ]);
  const policy =
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  const unavailable =
    "No knowledge snapshot selected; no verified substitute is available.";
  function sendJson(request, response, status, value) {
    response.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(request.method === "HEAD" ? undefined : JSON.stringify(value));
  }
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Security-Policy", policy);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let url;
    try {
      url = new URL(request.url ?? "/", "http://127.0.0.1");
    } catch {
      response.writeHead(400).end();
      return;
    }
    if (url.pathname === "/api/knowledge/status") {
      sendJson(request, response, 200, {
        status: "unknown",
        loaded: Boolean(knowledge),
        limitation: knowledge
          ? "Metadata query only; provenance, review identity and compatibility are not verified."
          : unavailable,
      });
      return;
    }
    if (url.pathname === "/api/knowledge") {
      if (!knowledge) {
        sendJson(request, response, 503, {
          status: "unknown",
          loaded: false,
          mapping: null,
          matches: [],
          excluded: [],
          explanation: unavailable,
        });
        return;
      }
      try {
        sendJson(request, response, 200, knowledge.query(knowledgeQuery(url)));
      } catch {
        sendJson(request, response, 400, {
          status: "unknown",
          error: "Invalid knowledge query.",
        });
      }
      return;
    }
    const asset = assets.get(url.pathname);
    if (!asset) {
      response.writeHead(404).end();
      return;
    }
    try {
      const data = await readFile(
        new URL(`./dist/${asset[0]}`, import.meta.url),
      );
      response.writeHead(200, { "Content-Type": asset[1] });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch {
      response.writeHead(503).end("Build the viewer before starting it");
    }
  });
  server.on("error", () => {
    console.error("Viewer failed to listen on the requested loopback port");
    process.exitCode = 1;
  });
  server.listen(configuration.port, "127.0.0.1", () => {
    const address = server.address();
    console.log(`ArkCompat viewer: http://127.0.0.1:${address.port}`);
  });
  process.on("SIGTERM", () => server.close());
  process.on("SIGINT", () => server.close());
}

try {
  await main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Viewer startup failed.",
  );
  process.exitCode = 1;
}

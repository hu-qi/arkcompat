import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const args = process.argv.slice(2);
const port =
  args.length === 0
    ? 4318
    : args.length === 2 && args[0] === "--port" && /^\d+$/.test(args[1])
      ? Number(args[1])
      : NaN;
if (!Number.isInteger(port) || port < 0 || port > 65535)
  throw new Error("Usage: viewer [--port 0..65535]");
const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);
const policy =
  "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const server = createServer(async (request, response) => {
  response.setHeader("Content-Security-Policy", policy);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const asset = assets.get(request.url);
  if (!asset) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(new URL(`./dist/${asset[0]}`, import.meta.url));
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
server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`ArkCompat viewer: http://127.0.0.1:${address.port}`);
});
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());

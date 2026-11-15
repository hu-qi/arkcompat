import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Ajv } from "ajv";
import standaloneCode from "ajv/dist/standalone/index.js";
import { build } from "esbuild";

const root = fileURLToPath(new URL(".", import.meta.url));
const dist = join(root, "dist");
await mkdir(dist, { recursive: true });
const schema = JSON.parse(
  await readFile(
    new URL(
      "../../packages/contracts/scan-report.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const ajv = new Ajv({ code: { source: true, esm: true } });
await writeFile(
  join(dist, "validator.mjs"),
  standaloneCode(ajv, ajv.compile(schema)),
);
await build({
  entryPoints: [join(root, "src/main.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: join(dist, "app.js"),
  sourcemap: false,
});
// The release artifact must run without the workspace: bundle the optional
// knowledge-store dependency into a single self-contained server entry.
await build({
  entryPoints: [join(root, "server.mjs")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  outfile: join(dist, "server.bundle.mjs"),
  sourcemap: false,
});
await Promise.all(
  ["index.html", "styles.css"].map((file) =>
    copyFile(join(root, file), join(dist, file)),
  ),
);
// The bundled server resolves its knowledge schema next to the entry point.
await copyFile(
  new URL("../../packages/contracts/knowledge.schema.json", import.meta.url),
  join(dist, "knowledge.schema.json"),
);
console.log("Local report viewer built (schema 0.12.0, no runtime eval)");

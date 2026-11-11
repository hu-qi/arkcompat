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
await Promise.all(
  ["index.html", "styles.css"].map((file) =>
    copyFile(join(root, file), join(dist, file)),
  ),
);
console.log("Local report viewer built (schema 0.11.0, no runtime eval)");

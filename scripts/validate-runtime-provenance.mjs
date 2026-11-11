import Ajv from "ajv";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const schemaDirectory = join(repository, "schemas", "cyclonedx", "1.5");
const schemaNames = [
  "bom-1.5.schema.json",
  "jsf-0.82.schema.json",
  "spdx.schema.json",
];
const pinnedArtifacts = new Map([
  [
    "bom-1.5.schema.json",
    "067f7824b08653839ea050ae9e09ca48375eadc2652b0e2a299476e7db90335b",
  ],
  [
    "jsf-0.82.schema.json",
    "8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae",
  ],
  [
    "spdx.schema.json",
    "4f6e2b05c05d26a4f2dc5879fbc2fca94b0a28db46289d0c51345621b71cfbfc",
  ],
  [
    "LICENSE",
    "6c29f22a4a7385285c6f579ec9f33c5e989f00739d6b257243a0b082ec9447ae",
  ],
]);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readRegularFile(path, label) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    throw new Error(`${label} is missing.`);
  }
  if (!stat.isFile())
    throw new Error(`${label} must be a regular file without symlinks.`);
  return readFileSync(path);
}

function readJsonFile(path, label) {
  try {
    return JSON.parse(readRegularFile(path, label).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`${label} is not valid JSON.`);
    throw error;
  }
}

function schemaValidator() {
  const schemas = new Map();
  for (const [name, expected] of pinnedArtifacts) {
    const content = readRegularFile(
      join(schemaDirectory, name),
      `Vendored schema ${name}`,
    );
    if (digest(content) !== expected)
      throw new Error(`Vendored schema ${name} failed its pinned hash.`);
    if (schemaNames.includes(name))
      schemas.set(name, JSON.parse(content.toString("utf8")));
  }
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    unicodeRegExp: false,
    validateFormats: false,
  });
  for (const schema of schemas.values()) ajv.addSchema(schema, schema.$id);
  return ajv.compile(schemas.get("bom-1.5.schema.json"));
}

function validateComponent(component, seenReferences) {
  if (seenReferences.has(component["bom-ref"]))
    throw new Error("Runtime SBOM contains a duplicate component reference.");
  seenReferences.add(component["bom-ref"]);
  const properties = new Map(
    (component.properties ?? []).map(({ name, value }) => [name, value]),
  );
  for (const required of [
    "arkcompat:install-path",
    "arkcompat:package-json-sha256",
  ]) {
    if (!properties.has(required))
      throw new Error(`Runtime component is missing ${required}.`);
  }
  const installPath = properties.get("arkcompat:install-path");
  if (
    !installPath.startsWith("node_modules/") ||
    isAbsolute(installPath) ||
    installPath.split(/[\\/]/).includes("..")
  )
    throw new Error("Runtime component install path is not portable.");
  if (!/^[0-9a-f]{64}$/.test(properties.get("arkcompat:package-json-sha256")))
    throw new Error("Runtime component package hash is invalid.");
}

function validateSbom(bom) {
  const validate = schemaValidator();
  if (!validate(bom)) {
    const detail = validate.errors
      ?.slice(0, 3)
      .map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
      .join("; ");
    throw new Error(`Runtime SBOM failed CycloneDX 1.5 validation: ${detail}.`);
  }
  const references = new Set();
  const metadataReferences = new Set();
  const rootProperties = new Map(
    (bom.metadata.component.properties ?? []).map(({ name, value }) => [
      name,
      value,
    ]),
  );
  if (
    rootProperties.get("arkcompat:assessment") !==
    "portable-runtime-file-inventory-only"
  )
    throw new Error("Runtime SBOM assessment boundary is missing.");
  metadataReferences.add(bom.metadata.component["bom-ref"]);
  for (const component of bom.components ?? [])
    validateComponent(component, metadataReferences);
  for (const dependency of bom.dependencies ?? []) {
    if (references.has(dependency.ref))
      throw new Error("Runtime SBOM contains duplicate dependency entries.");
    references.add(dependency.ref);
    if (!metadataReferences.has(dependency.ref))
      throw new Error(
        "Runtime SBOM dependency references an unknown component.",
      );
    for (const target of dependency.dependsOn ?? []) {
      if (!metadataReferences.has(target))
        throw new Error(
          "Runtime SBOM dependency target references an unknown component.",
        );
      if (target === dependency.ref)
        throw new Error("Runtime SBOM component depends on itself.");
    }
  }
  if (references.size !== metadataReferences.size)
    throw new Error("Every runtime component needs one dependency entry.");
}

function validateChecksums(runtime) {
  const checksumPath = join(runtime, "SHA256SUMS");
  const content = readRegularFile(checksumPath, "SHA256SUMS").toString("utf8");
  if (!content.endsWith("\n") || content.includes("\r"))
    throw new Error("SHA256SUMS must use canonical LF line endings.");
  const lines = content.slice(0, -1).split("\n");
  const recorded = new Map();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    if (!match) throw new Error("SHA256SUMS contains a malformed line.");
    const [, hash, path] = match;
    if (
      path === "SHA256SUMS" ||
      isAbsolute(path) ||
      path.split(/[\\/]/).includes("..") ||
      recorded.has(path)
    )
      throw new Error("SHA256SUMS contains an unsafe or duplicate path.");
    recorded.set(path, hash);
  }
  const actualFiles = [];
  function walk(directory, prefix) {
    for (const entry of readdirSync(directory, {
      withFileTypes: true,
    }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const absolute = join(directory, entry.name);
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink())
        throw new Error("Runtime checksum input contains a symlink.");
      if (entry.isDirectory()) {
        walk(absolute, path);
        continue;
      }
      if (!entry.isFile())
        throw new Error("Runtime checksum input contains a special file.");
      if (path !== "SHA256SUMS") actualFiles.push({ absolute, path });
    }
  }
  walk(runtime, "");
  actualFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const expectedOrder = actualFiles.map(({ path }) => path);
  if (JSON.stringify([...recorded.keys()]) !== JSON.stringify(expectedOrder))
    throw new Error("SHA256SUMS must list every runtime file in sorted order.");
  for (const { absolute, path } of actualFiles) {
    if (digest(readRegularFile(absolute, path)) !== recorded.get(path))
      throw new Error(`Checksum mismatch for ${path}.`);
  }
  return actualFiles.length;
}

export function validateRuntimeProvenance(runtimePath) {
  let runtime;
  try {
    if (lstatSync(runtimePath).isSymbolicLink())
      throw new Error("Runtime directory must not be a symlink.");
    runtime = realpathSync(runtimePath);
  } catch {
    throw new Error("Runtime directory is missing.");
  }
  const bom = readJsonFile(join(runtime, "SBOM.cdx.json"), "SBOM.cdx.json");
  validateSbom(bom);
  const files = validateChecksums(runtime);
  return {
    components: (bom.components ?? []).length,
    dependencies: (bom.dependencies ?? []).length,
    files,
  };
}

function main() {
  const [runtime, ...extra] = process.argv.slice(2);
  if (!runtime || extra.length)
    throw new Error(
      "Usage: node scripts/validate-runtime-provenance.mjs <runtime-directory>",
    );
  const result = validateRuntimeProvenance(resolve(runtime));
  console.log(
    `Runtime provenance verified: ${result.components} components, ${result.dependencies} dependency entries, ${result.files} files.`,
  );
}

try {
  if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  )
    main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

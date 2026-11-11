import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { runtimeNotices } from "./runtime-notices.mjs";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function portable(root, path) {
  return relative(root, path).split(sep).join("/");
}

function packageParts(name) {
  if (name.startsWith("@")) {
    const slash = name.indexOf("/");
    if (slash < 2 || slash === name.length - 1)
      throw new Error("Invalid scoped package name.");
    return { group: name.slice(0, slash), name: name.slice(slash + 1) };
  }
  return { name };
}

function purl(name, version) {
  const encoded = encodeURIComponent(version);
  if (name.startsWith("@")) {
    const { group, name: local } = packageParts(name);
    return `pkg:npm/${encodeURIComponent(group)}/${encodeURIComponent(local)}@${encoded}`;
  }
  return `pkg:npm/${encodeURIComponent(name)}@${encoded}`;
}

function componentReference(name, version, installPath) {
  return `urn:arkcompat:component:${encodeURIComponent(name)}@${encodeURIComponent(version)}:${encodeURIComponent(installPath)}`;
}

function assertRegularDirectory(path, label) {
  const stat = lstatSync(path);
  if (!stat.isDirectory())
    throw new Error(`${label} must be a regular directory without symlinks.`);
}

function readManifest(path) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("Runtime package manifest is missing or invalid JSON.");
  }
  if (
    !manifest ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    typeof manifest.name !== "string" ||
    !manifest.name.trim() ||
    typeof manifest.version !== "string" ||
    !manifest.version.trim()
  )
    throw new Error(
      "Runtime package manifest must declare a name and version.",
    );
  return manifest;
}

const dependencyFields = [
  ["dependencies", "runtime"],
  ["optionalDependencies", "optional"],
  ["peerDependencies", "peer"],
];

function dependencyRelationships(manifest) {
  return dependencyFields.flatMap(([field]) =>
    Object.keys(manifest[field] ?? {}).map((name) => ({ field, name })),
  );
}

function dependencyNames(manifest) {
  return new Set(dependencyRelationships(manifest).map(({ name }) => name));
}

function installedPackages(runtime) {
  const packages = [];
  function inspect(packageDirectory, installPath) {
    const manifestPath = join(packageDirectory, "package.json");
    if (!existsSync(manifestPath))
      throw new Error(`Missing package.json at ${installPath}.`);
    const manifest = readManifest(manifestPath);
    packages.push({ directory: packageDirectory, installPath, manifest });
    const nested = join(packageDirectory, "node_modules");
    if (existsSync(nested))
      walkModules(nested, join(installPath, "node_modules"));
  }
  function walkModules(modulesDirectory, installPrefix) {
    assertRegularDirectory(modulesDirectory, "node_modules");
    for (const entry of readdirSync(modulesDirectory, {
      withFileTypes: true,
    }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (entry.name.startsWith(".")) continue;
      const path = join(modulesDirectory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`Runtime dependency ${entry.name} is a symlink.`);
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith("@")) {
        assertRegularDirectory(path, "Package scope");
        for (const scoped of readdirSync(path, { withFileTypes: true }).sort(
          (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
        )) {
          if (scoped.name.startsWith(".")) continue;
          const packagePath = join(path, scoped.name);
          if (scoped.isSymbolicLink())
            throw new Error(
              `Runtime dependency ${entry.name}/${scoped.name} is a symlink.`,
            );
          if (!scoped.isDirectory()) continue;
          inspect(packagePath, `${installPrefix}/${entry.name}/${scoped.name}`);
        }
      } else {
        inspect(path, `${installPrefix}/${entry.name}`);
      }
    }
  }
  const modules = join(runtime, "node_modules");
  if (existsSync(modules)) walkModules(modules, "node_modules");
  return packages.sort((a, b) =>
    a.installPath < b.installPath ? -1 : a.installPath > b.installPath ? 1 : 0,
  );
}

function resolvedDependency(packages, from, name) {
  let directory = from;
  while (directory.length) {
    const candidate = join(directory, "node_modules", name);
    const found = packages.find(
      (entry) => resolve(entry.directory) === resolve(candidate),
    );
    if (found) return found;
    const parent = resolve(directory, "..");
    if (parent === directory) break;
    directory = parent;
  }
  return undefined;
}

function unresolvedDependencyDeclarations(packages, from, manifest) {
  return dependencyRelationships(manifest)
    .filter(({ name }) => !resolvedDependency(packages, from, name))
    .map(({ field, name }) => `${field}:${name}`)
    .join(",");
}

function component(entry, notice, packages) {
  const { manifest, installPath, directory } = entry;
  const parts = packageParts(manifest.name);
  const metadataHash = digest(readFileSync(join(directory, "package.json")));
  const unresolved = unresolvedDependencyDeclarations(
    packages,
    directory,
    manifest,
  );
  const properties = [
    { name: "arkcompat:install-path", value: installPath },
    { name: "arkcompat:package-json-sha256", value: metadataHash },
  ];
  if (notice?.gaps.length)
    properties.push({
      name: "arkcompat:notice-gaps",
      value: notice.gaps.join(","),
    });
  if (unresolved)
    properties.push({
      name: "arkcompat:unresolved-dependency-declarations",
      value: unresolved,
    });
  const declared =
    typeof manifest.license === "string" && manifest.license.trim()
      ? manifest.license.trim()
      : null;
  return {
    type: "library",
    ...(parts.group ? { group: parts.group } : {}),
    name: parts.name,
    version: manifest.version,
    "bom-ref": componentReference(manifest.name, manifest.version, installPath),
    purl: purl(manifest.name, manifest.version),
    ...(declared ? { licenses: [{ license: { name: declared } }] } : {}),
    properties,
  };
}

export function runtimeSbom(runtimePath) {
  const runtime = realpathSync(runtimePath);
  const rootManifest = readManifest(join(runtime, "package.json"));
  const packages = installedPackages(runtime);
  const notices = runtimeNotices(runtime);
  const noticeByPath = new Map(
    notices.packages.map((notice) => [notice.installPath, notice]),
  );
  const entries = new Map(
    packages.map((entry) => [
      entry.installPath,
      {
        ...entry,
        reference: componentReference(
          entry.manifest.name,
          entry.manifest.version,
          entry.installPath,
        ),
      },
    ]),
  );
  const components = [...entries.values()].map((entry) =>
    component(entry, noticeByPath.get(entry.installPath), packages),
  );
  const rootReference = componentReference(
    rootManifest.name,
    rootManifest.version,
    "<portable-cli-root>",
  );
  const rootUnresolved = unresolvedDependencyDeclarations(
    packages,
    runtime,
    rootManifest,
  );
  const rootProperties = [
    {
      name: "arkcompat:assessment",
      value: "portable-runtime-file-inventory-only",
    },
    {
      name: "arkcompat:license-boundary",
      value: "declarations-not-authenticated; standalone-notice-files-required",
    },
    {
      name: "arkcompat:vulnerability-boundary",
      value: "not-evaluated",
    },
    {
      name: "arkcompat:dependency-scope-boundary",
      value:
        "installed-component-scope-not-asserted; edges-follow-manifest-declarations; unresolved-declarations-listed",
    },
  ];
  if (rootUnresolved)
    rootProperties.push({
      name: "arkcompat:unresolved-dependency-declarations",
      value: rootUnresolved,
    });
  const dependencies = [
    {
      ref: rootReference,
      dependsOn: [...dependencyNames(rootManifest)]
        .map((name) => {
          const found = resolvedDependency(packages, runtime, name);
          return found
            ? entries.get(portable(runtime, found.directory))?.reference
            : undefined;
        })
        .filter(Boolean)
        .sort(),
    },
    ...[...entries.values()].map((entry) => ({
      ref: entry.reference,
      dependsOn: [...dependencyNames(entry.manifest)]
        .map((name) => {
          const found = resolvedDependency(packages, entry.directory, name);
          return found
            ? entries.get(portable(runtime, found.directory))?.reference
            : undefined;
        })
        .filter(Boolean)
        .sort(),
    })),
  ];
  const parts = packageParts(rootManifest.name);
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      tools: {
        components: [
          {
            type: "application",
            name: "arkcompat-runtime-sbom",
            version: "0.1.0",
          },
        ],
      },
      component: {
        type: "application",
        ...(parts.group ? { group: parts.group } : {}),
        name: parts.name,
        version: rootManifest.version,
        scope: "required",
        "bom-ref": rootReference,
        purl: purl(rootManifest.name, rootManifest.version),
        ...(typeof rootManifest.license === "string"
          ? { licenses: [{ license: { name: rootManifest.license } }] }
          : {}),
        properties: rootProperties,
      },
    },
    components,
    dependencies,
  };
}

export function runtimeChecksums(runtimePath) {
  const runtime = realpathSync(runtimePath);
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, {
      withFileTypes: true,
    }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error("Runtime checksum input contains a symlink.");
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile())
        throw new Error("Runtime checksum input contains a special file.");
      const relativePath = portable(runtime, path);
      if (relativePath !== "SHA256SUMS")
        files.push({ hash: digest(readFileSync(path)), path: relativePath });
    }
  }
  walk(runtime);
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return `${files.map(({ hash, path }) => `${hash}  ${path}`).join("\n")}\n`;
}

export function writeRuntimeProvenance(runtimePath) {
  const runtime = realpathSync(runtimePath);
  writeFileSync(
    join(runtime, "SBOM.cdx.json"),
    `${JSON.stringify(runtimeSbom(runtime), null, 2)}\n`,
    { flag: "wx" },
  );
  writeFileSync(join(runtime, "SHA256SUMS"), runtimeChecksums(runtime), {
    flag: "wx",
  });
}

function main() {
  const [runtime, ...extra] = process.argv.slice(2);
  if (!runtime || extra.length)
    throw new Error("Usage: node scripts/runtime-sbom.mjs <runtime-directory>");
  writeRuntimeProvenance(runtime);
  console.log("Runtime SBOM and SHA-256 inventory written.");
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

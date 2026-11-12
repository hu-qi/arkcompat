import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const SUPPLEMENTAL_LICENSE_SOURCES = Object.freeze([
  Object.freeze({
    name: "@yarnpkg/lockfile",
    version: "1.1.0",
    declaredLicense: "BSD-2-Clause",
    source: "https://raw.githubusercontent.com/yarnpkg/yarn/v1.1.0/LICENSE",
    sourceTag: "v1.1.0",
    sourceCommit: "ee5d4a153a3fe85145c45c0bb251ffffffcfe210",
    sha256: "ae09761b5d27e237571245437653b483bbb85de3cc64b802e8ef47d03aabec1e",
  }),
]);

const workspacePackages = new Set([
  "node_modules/@arkcompat/contracts",
  "node_modules/@arkcompat/core",
  "node_modules/@arkcompat/knowledge",
]);
const licenseName = /^(licen[cs]e|copying)([._ -]|$)/i;
const noticeName = /^(copyright|notice|third[-_ ]?party[-_ ]?notice)/i;

export function runtimeNotices(runtime) {
  const packages = [];
  const portable = (path) => relative(runtime, path).split(sep).join("/");
  const supplement = (name, version, declaredLicense) =>
    SUPPLEMENTAL_LICENSE_SOURCES.filter(
      (source) =>
        source.name === name &&
        source.version === version &&
        source.declaredLicense === declaredLicense,
    ).map((source) => ({
      kind: "upstream-tag",
      source: source.source,
      sourceTag: source.sourceTag,
      sourceCommit: source.sourceCommit,
      sha256: source.sha256,
    }));
  function walk(modules) {
    let names;
    try {
      names = readdirSync(modules).sort();
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const name of names) {
      if (name.startsWith(".")) continue;
      const dir = join(modules, name);
      if (name.startsWith("@")) {
        for (const scoped of readdirSync(dir).sort())
          inspect(join(dir, scoped));
      } else inspect(dir);
    }
  }

  function inspect(dir) {
    const installPath = portable(dir);
    if (!workspacePackages.has(installPath)) {
      const { name, version, license } = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8"),
      );
      if (typeof name !== "string" || typeof version !== "string")
        throw new Error("Packaged dependency is missing its name or version.");
      const declaredLicense =
        typeof license === "string" && license.trim() ? license : null;
      const licenseFiles = [];
      const noticeFiles = [];
      for (const file of readdirSync(dir, { withFileTypes: true }).sort(
        (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
      )) {
        if (!file.isFile()) continue;
        const files = licenseName.test(file.name)
          ? licenseFiles
          : noticeName.test(file.name)
            ? noticeFiles
            : undefined;
        if (!files) continue;
        const path = join(dir, file.name);
        const content = readFileSync(path);
        if (content.length)
          files.push({
            path: portable(path),
            sha256: createHash("sha256").update(content).digest("hex"),
          });
      }
      const gaps = [];
      if (!declaredLicense) gaps.push("missing-license-declaration");
      if (!licenseFiles.length) gaps.push("missing-license-file");
      packages.push({
        name,
        version,
        installPath,
        declaredLicense,
        licenseFiles,
        supplementalLicenseSources: supplement(name, version, declaredLicense),
        noticeFiles,
        gaps,
      });
    }
    walk(join(dir, "node_modules"));
  }
  walk(join(runtime, "node_modules"));
  return { schemaVersion: "1", assessment: "file-inventory-only", packages };
}

function main() {
  const [runtime, ...extra] = process.argv.slice(2);
  if (!runtime || extra.length)
    throw new Error(
      "Usage: node scripts/runtime-notices.mjs <runtime-directory>",
    );
  const target = resolve(runtime);
  writeFileSync(
    join(target, "THIRD-PARTY-NOTICES.json"),
    JSON.stringify(runtimeNotices(target), null, 2) + "\n",
  );
  console.log("Third-party notices written.");
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

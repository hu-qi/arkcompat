import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

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
        noticeFiles,
        gaps,
      });
    }
    walk(join(dir, "node_modules"));
  }
  walk(join(runtime, "node_modules"));
  return { schemaVersion: "1", assessment: "file-inventory-only", packages };
}

import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import JSON5 from "json5";
import type { Limitation, OhpmModuleInventory } from "@arkcompat/contracts";
import { dependencies, record } from "./declarations.js";
import type { OhpmLockReader } from "./ohpm-lock.js";
import { ohpmGraph, publicOhpmSpecifier } from "./ohpm-lock.js";

const profile = "build-profile.json5";
const manifest = "oh-package.json5";
const lock = "oh-package-lock.json5";

function parse(text: string, file: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON5.parse(text);
  } catch {
    throw new Error(`Invalid JSON5 in ${file}`);
  }
  if (!record(value)) throw new Error(`Expected an object in ${file}`);
  return value;
}

async function moduleDirectory(root: string, path: string) {
  let dir = root;
  for (const part of path.split("/")) {
    dir = join(dir, part);
    try {
      if (!(await lstat(dir)).isDirectory()) return undefined;
    } catch {
      return undefined;
    }
  }
  return dir;
}

export function readOhpmProfile(text: string) {
  return parse(text, profile);
}
export async function scanOhpmModules(
  root: string,
  read: (path: string) => Promise<string>,
  excluded: ReadonlySet<string>,
  data: Record<string, unknown>,
  shared?: OhpmLockReader,
) {
  const entries = data.modules === undefined ? [] : data.modules;
  if (!Array.isArray(entries) || entries.length > 128)
    throw new Error(
      `Invalid modules list in ${profile}; expected at most 128 entries`,
    );
  const paths = new Set<string>();
  const limitations: Limitation[] = [];
  const modules: { inventory: OhpmModuleInventory; manifestText: string }[] =
    [];
  for (const item of entries) {
    if (!record(item) || typeof item.srcPath !== "string" || !item.srcPath)
      throw new Error(`Invalid module srcPath in ${profile}`);
    const path = item.srcPath.replace(/^\.\//, "");
    const parts = path.split("/");
    if (
      path.length > 1024 ||
      parts.length > 64 ||
      !parts.every(
        (part) =>
          /^[A-Za-z0-9_][A-Za-z0-9._-]*$/.test(part) && !excluded.has(part),
      )
    ) {
      limitations.push({
        code: "external-ohpm-module-not-analyzed",
        path: profile,
      });
      continue;
    }
    if (paths.has(path)) throw new Error(`Duplicate module path in ${profile}`);
    paths.add(path);
  }
  for (const path of [...paths].sort()) {
    const dir = await moduleDirectory(root, path);
    if (!dir) {
      limitations.push({ code: "ohpm-module-directory-unavailable", path });
      continue;
    }
    const names = await readdir(dir);
    if (!names.includes(manifest)) {
      limitations.push({ code: "ohpm-module-manifest-missing", path });
      continue;
    }
    const manifestPath = path + "/" + manifest;
    const manifestText = await read(join(dir, manifest));
    const data = parse(manifestText, manifestPath);
    const raw = dependencies(data, manifestPath);
    const inventory: OhpmModuleInventory = {
      path,
      dependencies: raw.map((d) => ({
        ...d,
        specifier: publicOhpmSpecifier(d.specifier),
      })),
      dependencyGraph: {
        source: null,
        lockfileVersion: null,
        nodes: [],
        edges: [],
      },
      coverage: "declarations-only",
    };
    if (Object.hasOwn(data, "dynamicDependencies"))
      limitations.push({
        code: "ohpm-dynamic-dependencies-not-analyzed",
        path: manifestPath,
      });
    if (shared?.unified) {
      const result = shared.graphFor(raw, path);
      inventory.dependencyGraph = result.graph;
      inventory.coverage = "ohpm-lockfile-partial";
      limitations.push({ code: "ohpm-unified-root-lock-used", path });
      if (names.includes(lock))
        limitations.push({
          code: "ohpm-module-lock-ignored-by-unified-root",
          path: path + "/" + lock,
        });
      for (const limitation of result.limitations)
        limitations.push({ code: limitation.code, path });
    } else if (names.includes(lock)) {
      const result = ohpmGraph(await read(join(dir, lock)), raw);
      inventory.dependencyGraph = result.graph;
      if (result.parsed) inventory.coverage = "ohpm-lockfile-partial";
      for (const limitation of result.limitations)
        limitations.push({ code: limitation.code, path: path + "/" + lock });
    } else {
      limitations.push({
        code: "transitive-dependencies-not-analyzed",
        path: manifestPath,
      });
    }
    modules.push({ inventory, manifestText });
  }
  return { modules, limitations };
}

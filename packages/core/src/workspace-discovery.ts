import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Limitation } from "@arkcompat/contracts";
import { dependencies, packageName, record } from "./declarations.js";

const manifestName = "package.json";
const maxWorkspaces = 128;
const maxPathLength = 1024;
const maxPathParts = 64;

export interface WorkspaceManifest {
  path: string;
  manifestPath: string;
  text: string;
  data: Record<string, unknown>;
  dependencies: ReturnType<typeof dependencies>;
  name: string | null;
  version: string | null;
}

interface WorkspaceDiscoveryOptions {
  root: string;
  entries: string[];
  excluded: ReadonlySet<string>;
  read: (path: string) => Promise<string>;
  codePrefix: "npm-workspace" | "pnpm-workspace" | "yarn-workspace";
}

export function workspaceSelections(
  manifest: Record<string, unknown>,
  codePrefix: "npm-workspace" | "yarn-workspace",
) {
  if (manifest.workspaces === undefined)
    return { entries: [] as string[], limitations: [] as Limitation[] };
  const value = manifest.workspaces;
  let entries: unknown;
  const limitations: Limitation[] = [];
  if (Array.isArray(value)) entries = value;
  else if (record(value) && Array.isArray(value.packages)) {
    entries = value.packages;
    if (Object.hasOwn(value, "nohoist"))
      limitations.push({ code: `${codePrefix}-nohoist-not-analyzed` });
  } else {
    throw new Error(
      "package.json workspaces must be a string array or an object with a packages string array",
    );
  }
  if (
    !Array.isArray(entries) ||
    !entries.every((entry) => typeof entry === "string" && entry.length > 0)
  ) {
    throw new Error("package.json workspaces contains an invalid selection");
  }
  return { entries: entries as string[], limitations };
}

function safePart(part: string): boolean {
  return (
    part !== "." && part !== ".." && /^[A-Za-z0-9_][A-Za-z0-9._-]*$/.test(part)
  );
}

function unsafePattern(raw: string): boolean {
  return (
    raw.length === 0 ||
    raw.length > maxPathLength ||
    raw.includes("\\") ||
    raw.includes("\0") ||
    raw.includes(":") ||
    raw.startsWith("/")
  );
}

function normalizePattern(
  raw: string,
  excluded: ReadonlySet<string>,
  prefix: WorkspaceDiscoveryOptions["codePrefix"],
):
  | { parts: string[]; limitation: null }
  | { parts: null; limitation: Limitation } {
  const value = raw.startsWith("./") ? raw.slice(2) : raw;
  if (unsafePattern(value)) {
    return {
      parts: null,
      limitation: { code: `${prefix}-pattern-unsafe` },
    };
  }
  const parts = value.split("/");
  if (
    parts.length > maxPathParts ||
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        excluded.has(part) ||
        part.includes("\\") ||
        part.includes(":"),
    )
  ) {
    return {
      parts: null,
      limitation: { code: `${prefix}-pattern-unsafe` },
    };
  }
  if (!parts.every((part) => part === "*" || safePart(part))) {
    return {
      parts: null,
      limitation: { code: `${prefix}-pattern-unsupported` },
    };
  }
  return { parts, limitation: null };
}

function addLimitation(
  limitations: Limitation[],
  seen: Set<string>,
  limitation: Limitation,
) {
  const key = JSON.stringify(limitation);
  if (!seen.has(key)) {
    seen.add(key);
    limitations.push(limitation);
  }
}

async function resolvePattern(
  root: string,
  parts: string[],
  excluded: ReadonlySet<string>,
  prefix: WorkspaceDiscoveryOptions["codePrefix"],
  limitations: Limitation[],
  seenLimitations: Set<string>,
) {
  let prefixes = [""];
  for (const [index, part] of parts.entries()) {
    const next: string[] = [];
    for (const prefixPath of prefixes) {
      if (part !== "*") {
        const path = prefixPath ? prefixPath + "/" + part : part;
        try {
          if ((await lstat(join(root, path))).isDirectory()) next.push(path);
          else
            addLimitation(limitations, seenLimitations, {
              code: `${prefix}-directory-unavailable`,
              path,
            });
        } catch {
          addLimitation(limitations, seenLimitations, {
            code: `${prefix}-directory-unavailable`,
            path,
          });
        }
        continue;
      }
      let entries;
      try {
        entries = await readdir(join(root, prefixPath), {
          withFileTypes: true,
        });
      } catch {
        if (prefixPath)
          addLimitation(limitations, seenLimitations, {
            code: `${prefix}-directory-unavailable`,
            path: prefixPath,
          });
        continue;
      }
      entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      for (const entry of entries) {
        const path = prefixPath ? prefixPath + "/" + entry.name : entry.name;
        if (
          entry.isDirectory() &&
          safePart(entry.name) &&
          !excluded.has(entry.name)
        )
          next.push(path);
        else if (entry.isSymbolicLink())
          addLimitation(limitations, seenLimitations, {
            code: `${prefix}-directory-unavailable`,
            path,
          });
      }
    }
    prefixes = next;
    if (!prefixes.length) return [] as string[];
    if (index === parts.length - 1) return prefixes.sort();
  }
  return prefixes.sort();
}

async function parseWorkspace(
  root: string,
  path: string,
  read: WorkspaceDiscoveryOptions["read"],
  prefix: WorkspaceDiscoveryOptions["codePrefix"],
  limitations: Limitation[],
  seenLimitations: Set<string>,
): Promise<WorkspaceManifest | null> {
  const manifestPath = path + "/" + manifestName;
  try {
    const stat = await lstat(join(root, manifestPath));
    if (!stat.isFile() || stat.isSymbolicLink()) {
      addLimitation(limitations, seenLimitations, {
        code: `${prefix}-manifest-not-regular`,
        path: manifestPath,
      });
      return null;
    }
  } catch {
    addLimitation(limitations, seenLimitations, {
      code: `${prefix}-manifest-missing`,
      path: manifestPath,
    });
    return null;
  }
  let text: string;
  try {
    text = await read(join(root, manifestPath));
  } catch {
    addLimitation(limitations, seenLimitations, {
      code: `${prefix}-manifest-unavailable`,
      path: manifestPath,
    });
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON in ${manifestPath}`);
  }
  if (!record(data)) throw new Error(`Expected an object in ${manifestPath}`);
  const declared = dependencies(data, manifestPath);
  const name =
    typeof data.name === "string" && packageName(data.name) ? data.name : null;
  const version =
    typeof data.version === "string" && data.version.trim()
      ? data.version
      : null;
  return {
    path,
    manifestPath,
    text,
    data,
    dependencies: declared,
    name,
    version,
  };
}

export async function discoverWorkspaceManifests(
  options: WorkspaceDiscoveryOptions,
): Promise<{
  paths: Set<string>;
  manifests: WorkspaceManifest[];
  duplicateNames: Set<string>;
  limitations: Limitation[];
}> {
  const limitations: Limitation[] = [];
  const seenLimitations = new Set<string>();
  const paths = new Set<string>();
  const selections: string[][] = [];
  for (const entry of options.entries) {
    const normalized = normalizePattern(
      entry,
      options.excluded,
      options.codePrefix,
    );
    if (!normalized.parts) {
      addLimitation(limitations, seenLimitations, normalized.limitation);
      continue;
    }
    selections.push(normalized.parts);
  }
  if (selections.length > maxWorkspaces) {
    addLimitation(limitations, seenLimitations, {
      code: `${options.codePrefix}-limit-exceeded`,
    });
    selections.length = maxWorkspaces;
  }
  for (const parts of selections) {
    const resolved = await resolvePattern(
      options.root,
      parts,
      options.excluded,
      options.codePrefix,
      limitations,
      seenLimitations,
    );
    for (const path of resolved) {
      if (paths.size >= maxWorkspaces) {
        addLimitation(limitations, seenLimitations, {
          code: `${options.codePrefix}-limit-exceeded`,
        });
        break;
      }
      paths.add(path);
    }
  }
  const manifests: WorkspaceManifest[] = [];
  for (const path of [...paths].sort()) {
    const workspace = await parseWorkspace(
      options.root,
      path,
      options.read,
      options.codePrefix,
      limitations,
      seenLimitations,
    );
    if (workspace) manifests.push(workspace);
  }
  const byName = new Map<string, WorkspaceManifest[]>();
  for (const workspace of manifests) {
    if (!workspace.name) {
      addLimitation(limitations, seenLimitations, {
        code: `${options.codePrefix}-name-missing`,
        path: workspace.manifestPath,
      });
      continue;
    }
    const entries = byName.get(workspace.name) ?? [];
    entries.push(workspace);
    byName.set(workspace.name, entries);
  }
  const duplicateNames = new Set<string>();
  for (const [name, entries] of byName)
    if (entries.length > 1) duplicateNames.add(name);
  for (const name of [...duplicateNames].sort()) {
    for (const workspace of byName.get(name)!)
      addLimitation(limitations, seenLimitations, {
        code: `${options.codePrefix}-name-duplicate`,
        path: workspace.manifestPath,
      });
  }
  return { paths, manifests, duplicateNames, limitations };
}

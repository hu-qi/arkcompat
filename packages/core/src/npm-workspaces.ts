import { lstat, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  DependencyGraph,
  Limitation,
  ModuleInventory,
} from "@arkcompat/contracts";
import {
  dependencies,
  effectiveDependencies,
  packageName,
  publicSpecifier,
  record,
} from "./declarations.js";
import type { NpmWorkspaceLockRecord } from "./npm-lock.js";

const manifestName = "package.json";
const maxWorkspaces = 128;
const maxPathLength = 1024;
const maxPathParts = 64;

interface ParsedWorkspace {
  path: string;
  manifestPath: string;
  text: string;
  data: Record<string, unknown>;
  dependencies: ReturnType<typeof dependencies>;
  name: string | null;
  version: string | null;
}

interface WorkspaceOptions {
  root: string;
  manifest: Record<string, unknown>;
  graph: DependencyGraph;
  lockRecords: NpmWorkspaceLockRecord[];
  excluded: ReadonlySet<string>;
  read: (path: string) => Promise<string>;
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
):
  | { parts: string[]; limitation: null }
  | { parts: null; limitation: Limitation } {
  const value = raw.startsWith("./") ? raw.slice(2) : raw;
  if (unsafePattern(value)) {
    return {
      parts: null,
      limitation: { code: "npm-workspace-pattern-unsafe" },
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
      limitation: { code: "npm-workspace-pattern-unsafe" },
    };
  }
  if (!parts.every((part) => part === "*" || safePart(part))) {
    return {
      parts: null,
      limitation: { code: "npm-workspace-pattern-unsupported" },
    };
  }
  return { parts, limitation: null };
}

function workspaceSelections(manifest: Record<string, unknown>) {
  if (manifest.workspaces === undefined)
    return { entries: [] as string[], limitations: [] as Limitation[] };
  const value = manifest.workspaces;
  let entries: unknown;
  const limitations: Limitation[] = [];
  if (Array.isArray(value)) entries = value;
  else if (record(value) && Array.isArray(value.packages)) {
    entries = value.packages;
    if (Object.hasOwn(value, "nohoist"))
      limitations.push({ code: "npm-workspace-nohoist-not-analyzed" });
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
  limitations: Limitation[],
  seenLimitations: Set<string>,
) {
  let prefixes = [""];
  for (const [index, part] of parts.entries()) {
    const next: string[] = [];
    for (const prefix of prefixes) {
      if (part !== "*") {
        const path = prefix ? prefix + "/" + part : part;
        try {
          if ((await lstat(join(root, path))).isDirectory()) next.push(path);
          else
            addLimitation(limitations, seenLimitations, {
              code: "npm-workspace-directory-unavailable",
              path,
            });
        } catch {
          addLimitation(limitations, seenLimitations, {
            code: "npm-workspace-directory-unavailable",
            path,
          });
        }
        continue;
      }
      let entries;
      try {
        entries = await readdir(join(root, prefix), { withFileTypes: true });
      } catch {
        if (prefix)
          addLimitation(limitations, seenLimitations, {
            code: "npm-workspace-directory-unavailable",
            path: prefix,
          });
        continue;
      }
      entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      for (const entry of entries) {
        const path = prefix ? prefix + "/" + entry.name : entry.name;
        if (
          entry.isDirectory() &&
          safePart(entry.name) &&
          !excluded.has(entry.name)
        )
          next.push(path);
        else if (entry.isSymbolicLink())
          addLimitation(limitations, seenLimitations, {
            code: "npm-workspace-directory-unavailable",
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
  read: WorkspaceOptions["read"],
  limitations: Limitation[],
  seenLimitations: Set<string>,
): Promise<ParsedWorkspace | null> {
  const manifestPath = path + "/" + manifestName;
  try {
    const stat = await lstat(join(root, manifestPath));
    if (!stat.isFile() || stat.isSymbolicLink()) {
      addLimitation(limitations, seenLimitations, {
        code: "npm-workspace-manifest-not-regular",
        path: manifestPath,
      });
      return null;
    }
  } catch {
    addLimitation(limitations, seenLimitations, {
      code: "npm-workspace-manifest-missing",
      path: manifestPath,
    });
    return null;
  }
  let text: string;
  try {
    text = await read(join(root, manifestPath));
  } catch {
    addLimitation(limitations, seenLimitations, {
      code: "npm-workspace-manifest-unavailable",
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

function projectGraph(graph: DependencyGraph, start: string) {
  const edgesByFrom = new Map<string, DependencyGraph["edges"]>();
  for (const edge of graph.edges) {
    const entries = edgesByFrom.get(edge.from) ?? [];
    entries.push(edge);
    edgesByFrom.set(edge.from, entries);
  }
  const queue = [start];
  const expanded = new Set<string>();
  const reachable = new Set<string>();
  const edges: DependencyGraph["edges"] = [];
  while (queue.length) {
    const from = queue.shift()!;
    if (expanded.has(from)) continue;
    expanded.add(from);
    for (const edge of edgesByFrom.get(from) ?? []) {
      edges.push({ ...edge, from: from === start ? "" : edge.from });
      if (edge.to) {
        reachable.add(edge.to);
        if (!expanded.has(edge.to)) queue.push(edge.to);
      }
    }
  }
  return {
    source: graph.source,
    lockfileVersion: graph.lockfileVersion,
    nodes: graph.nodes.filter((node) => reachable.has(node.id)),
    edges,
  };
}

export async function scanNpmWorkspaces(options: WorkspaceOptions): Promise<{
  modules: { inventory: ModuleInventory; manifestText: string }[];
  limitations: Limitation[];
}> {
  const { entries, limitations } = workspaceSelections(options.manifest);
  if (!entries.length) return { modules: [], limitations };
  const seenLimitations = new Set(
    limitations.map((item) => JSON.stringify(item)),
  );
  const paths = new Set<string>();
  const selections: string[][] = [];
  for (const entry of entries) {
    const normalized = normalizePattern(entry, options.excluded);
    if (!normalized.parts) {
      addLimitation(limitations, seenLimitations, normalized.limitation);
      continue;
    }
    selections.push(normalized.parts);
  }
  if (selections.length > maxWorkspaces) {
    addLimitation(limitations, seenLimitations, {
      code: "npm-workspace-limit-exceeded",
    });
    selections.length = maxWorkspaces;
  }
  for (const parts of selections) {
    const resolved = await resolvePattern(
      options.root,
      parts,
      options.excluded,
      limitations,
      seenLimitations,
    );
    for (const path of resolved) {
      if (paths.size >= maxWorkspaces) {
        addLimitation(limitations, seenLimitations, {
          code: "npm-workspace-limit-exceeded",
        });
        break;
      }
      paths.add(path);
    }
  }
  const parsed: ParsedWorkspace[] = [];
  for (const path of [...paths].sort()) {
    const workspace = await parseWorkspace(
      options.root,
      path,
      options.read,
      limitations,
      seenLimitations,
    );
    if (workspace) parsed.push(workspace);
  }
  const byName = new Map<string, ParsedWorkspace[]>();
  for (const workspace of parsed) {
    if (!workspace.name) {
      addLimitation(limitations, seenLimitations, {
        code: "npm-workspace-name-missing",
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
        code: "npm-workspace-name-duplicate",
        path: workspace.manifestPath,
      });
  }
  const lockByPath = new Map(
    options.lockRecords.map((workspace) => [workspace.path, workspace]),
  );
  const modules: { inventory: ModuleInventory; manifestText: string }[] = [];
  for (const workspace of parsed) {
    const inventory: ModuleInventory = {
      kind: "npm",
      path: workspace.path,
      dependencies: workspace.dependencies.map((dependency) => ({
        ...dependency,
        specifier: publicSpecifier(dependency.specifier),
      })),
      dependencyGraph: {
        source: null,
        lockfileVersion: null,
        nodes: [],
        edges: [],
      },
      coverage: "declarations-only",
    };
    const lock = lockByPath.get(workspace.path);
    if (!workspace.name) {
      // The missing-name limitation above already keeps this module unresolved.
    } else if (!workspace.version) {
      addLimitation(limitations, seenLimitations, {
        code: "npm-workspace-version-missing",
        path: workspace.manifestPath,
      });
    } else if (duplicateNames.has(workspace.name)) {
      // Duplicate workspace names cannot safely select one lock link.
    } else if (!lock) {
      addLimitation(limitations, seenLimitations, {
        code: "npm-workspace-lock-entry-missing",
        path: workspace.manifestPath,
      });
    } else if (
      lock.name !== workspace.name ||
      (workspace.version !== null && lock.version !== workspace.version) ||
      JSON.stringify(effectiveDependencies(lock.declarations)) !==
        JSON.stringify(effectiveDependencies(workspace.dependencies))
    ) {
      addLimitation(limitations, seenLimitations, {
        code: "npm-workspace-lock-metadata-mismatch",
        path: workspace.manifestPath,
      });
    } else if (lock.linkNodes.length !== 1) {
      addLimitation(limitations, seenLimitations, {
        code: "npm-workspace-link-ambiguous",
        path: workspace.manifestPath,
      });
    } else {
      const start = lock.linkNodes[0]!;
      if (!options.graph.nodes.some((node) => node.id === start && node.link)) {
        addLimitation(limitations, seenLimitations, {
          code: "npm-workspace-lock-entry-missing",
          path: workspace.manifestPath,
        });
      } else {
        inventory.dependencyGraph = projectGraph(options.graph, start);
        inventory.coverage = "npm-lockfile-partial";
      }
    }
    modules.push({ inventory, manifestText: workspace.text });
  }
  return { modules, limitations };
}

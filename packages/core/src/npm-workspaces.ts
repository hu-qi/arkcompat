import type {
  DependencyGraph,
  Limitation,
  ModuleInventory,
} from "@arkcompat/contracts";
import {
  effectiveDependencies,
  publicSpecifier,
  record,
} from "./declarations.js";
import type { NpmWorkspaceLockRecord } from "./npm-lock.js";
import { discoverWorkspaceManifests } from "./workspace-discovery.js";

interface WorkspaceOptions {
  root: string;
  manifest: Record<string, unknown>;
  graph: DependencyGraph;
  lockRecords: NpmWorkspaceLockRecord[];
  excluded: ReadonlySet<string>;
  read: (path: string) => Promise<string>;
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
  const discovery = await discoverWorkspaceManifests({
    root: options.root,
    entries,
    excluded: options.excluded,
    read: options.read,
    codePrefix: "npm-workspace",
  });
  limitations.push(...discovery.limitations);
  const seenLimitations = new Set(
    limitations.map((item) => JSON.stringify(item)),
  );
  const lockByPath = new Map(
    options.lockRecords.map((workspace) => [workspace.path, workspace]),
  );
  const modules: { inventory: ModuleInventory; manifestText: string }[] = [];
  for (const workspace of discovery.manifests) {
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
    } else if (discovery.duplicateNames.has(workspace.name)) {
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

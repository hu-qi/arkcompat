import type {
  DeclaredDependency,
  DependencyEdge,
  DependencyGraph,
  Limitation,
  LockedPackage,
  ModuleInventory,
} from "@arkcompat/contracts";
import { effectiveDependencies, publicSpecifier } from "./declarations.js";
import { registryRangeStatus } from "./registry-range.js";
import type { YarnBerryWorkspaceEntry } from "./yarn-berry.js";
import {
  discoverWorkspaceManifests,
  workspaceSelections,
  type WorkspaceManifest,
} from "./workspace-discovery.js";

interface WorkspaceOptions {
  root: string;
  manifest: Record<string, unknown>;
  graph: DependencyGraph;
  parsed: boolean;
  workspaceEntries: YarnBerryWorkspaceEntry[];
  excluded: ReadonlySet<string>;
  read: (path: string) => Promise<string>;
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

function normalizedBerrySpecifier(specifier: string) {
  return specifier.startsWith("npm:") ? specifier.slice(4) : specifier;
}

function declarationsMatchManifest(
  entry: YarnBerryWorkspaceEntry,
  declared: ReturnType<typeof effectiveDependencies>,
) {
  const expected = declared
    .filter(
      (dependency) =>
        dependency.section === "dependencies" ||
        dependency.section === "optionalDependencies",
    )
    .map((dependency) => [
      dependency.section,
      dependency.name,
      dependency.specifier,
    ])
    .sort();
  const actual = effectiveDependencies(entry.dependencies)
    .filter(
      (dependency) =>
        dependency.section === "dependencies" ||
        dependency.section === "optionalDependencies",
    )
    .map((dependency) => [
      dependency.section,
      dependency.name,
      normalizedBerrySpecifier(dependency.specifier),
    ])
    .sort();
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function workspaceNode(workspace: WorkspaceManifest): LockedPackage {
  return {
    id: `yarn-berry-workspace:${workspace.path}`,
    installName: workspace.name!,
    name: workspace.name!,
    version: workspace.version,
    link: true,
  };
}

function projectModule(
  graph: DependencyGraph,
  declared: DeclaredDependency[],
  nodeBySelector: ReadonlyMap<string, LockedPackage>,
  workspaceNodeBySelector: ReadonlyMap<string, LockedPackage>,
  workspaceById: ReadonlyMap<string, WorkspaceManifest>,
  workspaceByName: ReadonlyMap<string, WorkspaceManifest>,
  berry: boolean,
) {
  const workspacePrefix = "yarn-berry-workspace:";
  const workspaceFromId = (id: string) =>
    id.startsWith(workspacePrefix)
      ? workspaceById.get(id.slice(workspacePrefix.length))
      : undefined;
  const globalEdgesByFrom = new Map<string, DependencyGraph["edges"]>();
  const globalNodeById = new Map(
    graph.nodes.map((node) => [node.id, node] as const),
  );
  for (const edge of graph.edges) {
    const entries = globalEdgesByFrom.get(edge.from) ?? [];
    entries.push(edge);
    globalEdgesByFrom.set(edge.from, entries);
  }
  const nodes = new Map<string, LockedPackage>();
  const edges: DependencyGraph["edges"] = [];
  const limitations: Limitation[] = [];
  const expanded = new Set<string>();
  const queue: {
    id: string;
    dependencies: DeclaredDependency[];
    root: boolean;
  }[] = [{ id: "", dependencies: effectiveDependencies(declared), root: true }];

  function registrySelector(dependency: DeclaredDependency) {
    return berry
      ? `${dependency.name}@${dependency.specifier.startsWith("npm:") ? dependency.specifier : `npm:${dependency.specifier}`}`
      : `${dependency.name}@${dependency.specifier}`;
  }

  function dependencyEdge(
    from: string,
    dependency: DeclaredDependency,
  ): DependencyGraph["edges"][number] {
    if (edges.length >= 20000)
      throw new Error("edge count limit exceeded (20000)");
    const selector = registrySelector(dependency);
    const workspaceSelector = `${dependency.name}@${dependency.specifier}`;
    const workspaceNode = workspaceNodeBySelector.get(workspaceSelector);
    const registered =
      dependency.section === "peerDependencies"
        ? undefined
        : nodeBySelector.get(selector);
    const localWorkspace =
      !workspaceNode && workspaceByName.has(dependency.name) && !berry;
    // Classic does not record the final local link. A registry descriptor with
    // the same name must not turn a selected workspace dependency into a
    // confident third-party resolution.
    const target = localWorkspace ? undefined : (workspaceNode ?? registered);
    const mismatch =
      target?.version !== null &&
      target?.version !== undefined &&
      dependency.section !== "peerDependencies" &&
      !localWorkspace &&
      registryRangeStatus(dependency.specifier, target.version) === "mismatch";
    const resolution: DependencyEdge["resolution"] =
      dependency.section === "peerDependencies" ||
      (target && target.version === null) ||
      localWorkspace
        ? "unsupported"
        : mismatch
          ? "mismatch"
          : target
            ? "locked"
            : "missing";
    const edge: DependencyEdge = {
      from,
      name: dependency.name,
      specifier: publicSpecifier(dependency.specifier),
      section: dependency.section,
      to:
        resolution === "locked" || resolution === "mismatch"
          ? target!.id
          : null,
      resolution,
    };
    if (resolution !== "locked")
      limitations.push({
        code: localWorkspace
          ? "yarn-classic-workspace-link-not-recorded"
          : resolution === "mismatch"
            ? "dependency-range-mismatch"
            : resolution === "missing"
              ? "dependency-edge-missing"
              : "dependency-edge-unsupported",
        path: localWorkspace ? dependency.name : from || "package.json",
      });
    return edge;
  }

  function transitiveEdges(from: string) {
    return (globalEdgesByFrom.get(from) ?? []).map((edge) => {
      if (edge.to !== null || edge.section === "peerDependencies") return edge;
      const workspace = workspaceNodeBySelector.get(
        `${edge.name}@${edge.specifier}`,
      );
      return workspace
        ? {
            ...edge,
            to: workspace.id,
            resolution: "locked" as const,
          }
        : edge;
    });
  }

  function enqueue(id: string) {
    if (expanded.has(id)) return;
    const workspace = workspaceFromId(id);
    if (workspace) {
      queue.push({
        id,
        dependencies: effectiveDependencies(workspace.dependencies),
        root: false,
      });
      return;
    }
    queue.push({
      id,
      dependencies: [],
      root: false,
    });
  }

  while (queue.length) {
    const current = queue.shift()!;
    if (expanded.has(current.id)) continue;
    expanded.add(current.id);
    const currentEdges =
      current.root || workspaceFromId(current.id)
        ? current.dependencies.map((dependency) =>
            dependencyEdge(current.id, dependency),
          )
        : transitiveEdges(current.id);
    for (const edge of currentEdges) {
      edges.push(edge);
      if (edge.to === null) continue;
      const localWorkspace = workspaceFromId(edge.to);
      const node = localWorkspace
        ? workspaceNode(localWorkspace)
        : globalNodeById.get(edge.to);
      if (node) nodes.set(node.id, node);
      enqueue(edge.to);
    }
  }
  return {
    source: graph.source,
    lockfileVersion: graph.lockfileVersion,
    nodes: [...nodes.values()].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
    edges,
    limitations,
  };
}

export async function scanYarnWorkspaces(options: WorkspaceOptions): Promise<{
  modules: { inventory: ModuleInventory; manifestText: string }[];
  limitations: Limitation[];
}> {
  const selections = workspaceSelections(options.manifest, "yarn-workspace");
  const limitations = [...selections.limitations];
  if (!selections.entries.length) return { modules: [], limitations };
  const discovery = await discoverWorkspaceManifests({
    root: options.root,
    entries: selections.entries,
    excluded: options.excluded,
    read: options.read,
    codePrefix: "yarn-workspace",
  });
  limitations.push(...discovery.limitations);
  const seenLimitations = new Set(
    limitations.map((value) => JSON.stringify(value)),
  );
  const workspaceByName = new Map<string, WorkspaceManifest>();
  for (const workspace of discovery.manifests)
    if (workspace.name && !discovery.duplicateNames.has(workspace.name))
      workspaceByName.set(workspace.name, workspace);
  const berryEntriesByPath = new Map<string, YarnBerryWorkspaceEntry>();
  for (const entry of options.workspaceEntries)
    if (entry.path !== ".") berryEntriesByPath.set(entry.path, entry);
  const workspaceNodeBySelector = new Map<string, LockedPackage>();
  const validWorkspaceByPath = new Map<string, WorkspaceManifest>();
  const berry = options.graph.lockfileVersion === 8;
  for (const workspace of discovery.manifests) {
    if (!workspace.name || !workspace.version) continue;
    if (discovery.duplicateNames.has(workspace.name)) continue;
    if (!options.parsed) continue;
    if (!berry) {
      validWorkspaceByPath.set(workspace.path, workspace);
      continue;
    }
    const entry = berryEntriesByPath.get(workspace.path);
    if (!entry) {
      addLimitation(limitations, seenLimitations, {
        code: "yarn-berry-workspace-lock-entry-missing",
        path: workspace.name,
      });
      continue;
    }
    if (
      !entry.selectors.every((selector) =>
        selector.startsWith(`${workspace.name}@workspace:`),
      ) ||
      !declarationsMatchManifest(
        entry,
        effectiveDependencies(workspace.dependencies),
      )
    ) {
      addLimitation(limitations, seenLimitations, {
        code: "yarn-berry-workspace-manifest-lock-mismatch",
        path: workspace.manifestPath,
      });
      continue;
    }
    const node = workspaceNode(workspace);
    validWorkspaceByPath.set(workspace.path, workspace);
    for (const selector of entry.selectors)
      workspaceNodeBySelector.set(selector, node);
  }
  for (const entry of options.workspaceEntries)
    if (entry.path !== "." && !validWorkspaceByPath.has(entry.path))
      addLimitation(limitations, seenLimitations, {
        code: "yarn-berry-workspace-lock-entry-not-selected",
        path: entry.path,
      });
  const nodeBySelector = new Map<string, LockedPackage>();
  for (const node of options.graph.nodes)
    if (node.id.startsWith("yarn:"))
      nodeBySelector.set(node.id.slice("yarn:".length), node);
    else if (node.id.startsWith("yarn-berry:"))
      nodeBySelector.set(node.id.slice("yarn-berry:".length), node);
  const modules: { inventory: ModuleInventory; manifestText: string }[] = [];
  for (const workspace of discovery.manifests) {
    const inventory: ModuleInventory = {
      kind: "yarn",
      path: workspace.path,
      dependencies: workspace.dependencies.map((dependency) => ({
        ...dependency,
        specifier: publicSpecifier(dependency.specifier),
      })),
      dependencyGraph: {
        source: options.graph.source,
        lockfileVersion: options.graph.lockfileVersion,
        nodes: [],
        edges: [],
      },
      coverage: "declarations-only",
    };
    if (!workspace.name) {
      // Discovery already reports the missing identity.
    } else if (!workspace.version) {
      addLimitation(limitations, seenLimitations, {
        code: "yarn-workspace-version-missing",
        path: workspace.manifestPath,
      });
    } else if (discovery.duplicateNames.has(workspace.name)) {
      // Duplicate names cannot safely select a workspace descriptor.
    } else if (!options.parsed) {
      addLimitation(limitations, seenLimitations, {
        code: "yarn-workspace-lock-not-parsed",
        path: workspace.manifestPath,
      });
    } else if (berry && !validWorkspaceByPath.has(workspace.path)) {
      // The specific Berry descriptor limitation is recorded above.
    } else {
      const projected = projectModule(
        options.graph,
        workspace.dependencies,
        nodeBySelector,
        workspaceNodeBySelector,
        validWorkspaceByPath,
        workspaceByName,
        berry,
      );
      inventory.dependencyGraph = {
        source: projected.source,
        lockfileVersion: projected.lockfileVersion,
        nodes: projected.nodes,
        edges: projected.edges,
      };
      inventory.coverage = berry
        ? "yarn-berry-lockfile-partial"
        : "yarn-classic-lockfile-partial";
      for (const limitation of projected.limitations)
        addLimitation(limitations, seenLimitations, limitation);
    }
    modules.push({ inventory, manifestText: workspace.text });
  }
  return { modules, limitations };
}

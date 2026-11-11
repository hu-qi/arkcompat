import { parseDocument } from "yaml";
import type {
  DeclaredDependency,
  DependencyEdge,
  DependencyGraph,
  DependencySection,
  Limitation,
  LockedPackage,
} from "@arkcompat/contracts";
import {
  dependencies,
  effectiveDependencies,
  packageName,
  publicSpecifier,
  record,
} from "./declarations.js";

const source = "pnpm-lock.yaml";
const sections: DependencySection[] = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];
function fail(detail: string): never {
  throw new Error(`${source}: ${detail}`);
}
interface RegistryIdentity {
  name: string;
  version: string;
  base: string;
  end: number;
}
/** Parse only registry versions and nested registry peer contexts; never URLs/paths/patch IDs. */
function registryIdentity(text: string): RegistryIdentity | null {
  if (text.length > 2048) return null;
  function part(start: number, depth: number): RegistryIdentity | null {
    if (depth > 32) return null;
    const match =
      /^((?:@[a-zA-Z0-9._~-]+\/)?[a-zA-Z0-9._~-]+)@(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)/.exec(
        text.slice(start),
      );
    if (!match || !packageName(match[1]!)) return null;
    let end = start + match[0].length;
    while (text[end] === "(") {
      const peer = part(end + 1, depth + 1);
      if (!peer || text[peer.end] !== ")") return null;
      end = peer.end + 1;
    }
    return { name: match[1]!, version: match[2]!, base: match[0], end };
  }
  const identity = part(0, 0);
  return identity?.end === text.length ? identity : null;
}
function yamlValue(text: string): unknown {
  try {
    const doc = parseDocument(text, {
      prettyErrors: false,
      uniqueKeys: true,
      stringKeys: true,
    });
    if (doc.errors.length || doc.warnings.length)
      return fail("Invalid or unsupported YAML");
    return doc.toJS({ maxAliasCount: 0 });
  } catch {
    // Parser errors may contain source snippets, URLs and credentials.
    return fail(
      "Invalid or unsupported YAML (aliases, tags and duplicate keys are not accepted)",
    );
  }
}
function table(value: unknown, field: string): Record<string, unknown> {
  if (value === undefined) return {};
  if (!record(value)) return fail(`${field} must be a mapping`);
  return value;
}
interface ImporterEntry {
  name: string;
  section: DependencySection;
  specifier: string;
  version: string;
}
function importerEntries(
  importer: Record<string, unknown>,
): Map<string, ImporterEntry> {
  const result = new Map<string, ImporterEntry>();
  for (const section of sections) {
    const entries = table(importer[section], `importer ${section}`);
    for (const name of Object.keys(entries).sort()) {
      const entry = entries[name];
      if (
        !packageName(name) ||
        !record(entry) ||
        typeof entry.specifier !== "string" ||
        !entry.specifier.trim() ||
        typeof entry.version !== "string" ||
        !entry.version.trim()
      )
        return fail(
          "importer dependencies require a package name, specifier and version strings",
        );
      result.set(JSON.stringify([section, name]), {
        name,
        section,
        specifier: entry.specifier,
        version: entry.version,
      });
    }
  }
  return result;
}

export interface PnpmImporterRecord {
  path: string;
  entries: Map<string, ImporterEntry>;
}

/** v9 importer inventory. No installation, peer satisfaction or workspace execution. */
export function pnpmGraph(
  text: string,
  declared: DeclaredDependency[],
): {
  graph: DependencyGraph;
  limitations: Limitation[];
  parsed: boolean;
  importers: PnpmImporterRecord[];
} {
  const graph: DependencyGraph = {
    source,
    lockfileVersion: null,
    nodes: [],
    edges: [],
  };
  const limitations: Limitation[] = [];
  const lock = yamlValue(text);
  if (
    !record(lock) ||
    !["string", "number"].includes(typeof lock.lockfileVersion) ||
    !/^\d+(?:\.\d+)?$/.test(String(lock.lockfileVersion)) ||
    Number(lock.lockfileVersion) < 1 ||
    !Number.isFinite(Number(lock.lockfileVersion))
  )
    return fail("expected a numeric lockfileVersion");
  graph.lockfileVersion = Number(lock.lockfileVersion);
  if (graph.lockfileVersion !== 9)
    return {
      graph,
      parsed: false,
      importers: [],
      limitations: [
        { code: "unsupported-pnpm-lockfile-version", path: source },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  const importers = table(lock.importers, "importers");
  if (!record(importers["."])) return fail('expected the root importer "."');
  if (Object.keys(importers).length > 10000)
    return fail("package/importer count limit exceeded (10000)");
  const importerRecords: PnpmImporterRecord[] = [];
  let importerEntryCount = 0;
  for (const path of Object.keys(importers).sort()) {
    if (
      path !== "." &&
      (path.length > 2048 ||
        !path
          .split("/")
          .every(
            (p) =>
              p && p !== "." && p !== ".." && /^[a-zA-Z0-9@._~ -]+$/.test(p),
          ))
    )
      return fail("unsafe workspace importer path");
    if (!record(importers[path]))
      return fail("workspace importer must be a mapping");
    const entries = importerEntries(importers[path] as Record<string, unknown>);
    importerEntryCount += entries.size;
    if (importerEntryCount > 20000)
      return fail("importer dependency count limit exceeded (20000)");
    importerRecords.push({
      path,
      entries,
    });
  }
  const importer = importerRecords.find(
    (record) => record.path === ".",
  )!.entries;
  const packages = table(lock.packages, "packages");
  const snapshots = table(lock.snapshots, "snapshots");
  if (
    Object.keys(packages).length > 10000 ||
    Object.keys(snapshots).length > 10000
  )
    return fail("package/importer count limit exceeded (10000)");
  for (const metadata of Object.values(packages)) {
    if (!record(metadata)) return fail("package metadata must be a mapping");
    dependencies(metadata, source);
  }
  const nodes = new Map<string, LockedPackage>();
  for (const key of Object.keys(snapshots).sort()) {
    const snapshot = snapshots[key];
    if (!record(snapshot)) return fail("snapshot metadata must be a mapping");
    dependencies(snapshot, source);
    const identity = registryIdentity(key);
    if (!identity) {
      limitations.push({
        code: "pnpm-snapshot-identity-unsupported",
        path: source,
      });
      continue;
    }
    if (!record(packages[identity.base])) {
      limitations.push({ code: "pnpm-package-metadata-missing", path: source });
      continue;
    }
    const node: LockedPackage = {
      id: `pnpm:${key}`,
      installName: identity.name,
      name: identity.name,
      version: identity.version,
      link: false,
    };
    nodes.set(key, node);
    graph.nodes.push(node);
  }
  function edge(
    from: string,
    declaration: Pick<DeclaredDependency, "name" | "specifier" | "section">,
    reference: string | null,
  ) {
    if (graph.edges.length >= 20000)
      return fail("edge count limit exceeded (20000)");
    if (!packageName(declaration.name)) return fail("invalid dependency name");
    const key =
      reference === null
        ? null
        : registryIdentity(reference)
          ? reference
          : `${declaration.name}@${reference}`;
    const identity = key === null ? null : registryIdentity(key);
    const node = key === null ? undefined : nodes.get(key);
    const resolution: DependencyEdge["resolution"] =
      reference === null
        ? "missing"
        : !identity || /^(workspace:|file:|link:)/.test(declaration.specifier)
          ? "unsupported"
          : node
            ? "locked"
            : "missing";
    graph.edges.push({
      from,
      name: declaration.name,
      section: declaration.section,
      specifier: publicSpecifier(declaration.specifier),
      to: node?.id ?? null,
      resolution,
    });
    if (resolution !== "locked")
      limitations.push({
        code:
          resolution === "missing"
            ? "dependency-edge-missing"
            : "dependency-edge-unsupported",
        path: from || "package.json",
      });
  }
  const consumed = new Set<string>();
  let mismatch = false;
  for (const dependency of effectiveDependencies(declared)) {
    const section =
      dependency.section === "peerDependencies"
        ? "dependencies"
        : dependency.section;
    const key = JSON.stringify([section, dependency.name]);
    const entry = importer.get(key);
    if (!entry || entry.specifier !== dependency.specifier) mismatch = true;
    consumed.add(key);
    edge("", dependency, entry?.version ?? null);
  }
  if (
    consumed.size !== importer.size ||
    [...importer.keys()].some((key) => !consumed.has(key))
  )
    mismatch = true;
  if (mismatch)
    limitations.push({ code: "manifest-lockfile-mismatch", path: source });
  for (const [key, node] of nodes) {
    const snapshot = snapshots[key] as Record<string, unknown>;
    const identity = registryIdentity(key)!;
    const metadata = packages[identity.base] as Record<string, unknown>;
    const peerDeclarations = dependencies(metadata, source).filter(
      (d) => d.section === "peerDependencies",
    );
    const peers = new Map(peerDeclarations.map((d) => [d.name, d]));
    const snapshotDeclarations = effectiveDependencies(
      dependencies(snapshot, source),
    ).filter(
      (d) =>
        d.section === "dependencies" || d.section === "optionalDependencies",
    );
    for (const dependency of snapshotDeclarations) {
      const peer = peers.get(dependency.name);
      edge(
        node.id,
        {
          ...dependency,
          section: peer ? "peerDependencies" : dependency.section,
          specifier: peer?.specifier ?? dependency.specifier,
        },
        dependency.specifier,
      );
    }
    const recordedNames = new Set(snapshotDeclarations.map((d) => d.name));
    for (const peer of peerDeclarations) {
      if (!recordedNames.has(peer.name)) edge(node.id, peer, null);
    }
  }
  limitations.push(
    { code: "dependency-ranges-not-validated" },
    { code: "lockfile-install-state-not-verified" },
    { code: "pnpm-peer-conditions-not-verified" },
  );
  return { graph, limitations, parsed: true, importers: importerRecords };
}

/** Project one validated importer into a module-local graph. */
export function pnpmImporterGraph(
  graph: DependencyGraph,
  importer: PnpmImporterRecord,
  declared: DeclaredDependency[],
): DependencyGraph {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const directEdges: DependencyEdge[] = [];
  function target(
    declaration: DeclaredDependency,
  ): Pick<DependencyEdge, "to" | "resolution"> {
    const section =
      declaration.section === "peerDependencies"
        ? "dependencies"
        : declaration.section;
    const entry = importer.entries.get(
      JSON.stringify([section, declaration.name]),
    );
    if (!entry) return { to: null, resolution: "missing" };
    const key = registryIdentity(entry.version)
      ? entry.version
      : `${declaration.name}@${entry.version}`;
    const identity = registryIdentity(key);
    const node = identity ? nodes.get(`pnpm:${key}`) : undefined;
    return {
      to: node?.id ?? null,
      resolution:
        !identity || /^(workspace:|file:|link:)/.test(declaration.specifier)
          ? "unsupported"
          : node
            ? "locked"
            : "missing",
    };
  }
  for (const declaration of effectiveDependencies(declared)) {
    directEdges.push({
      from: "",
      name: declaration.name,
      section: declaration.section,
      specifier: publicSpecifier(declaration.specifier),
      ...target(declaration),
    });
  }
  const edgesByFrom = new Map<string, DependencyEdge[]>();
  for (const edge of graph.edges) {
    const entries = edgesByFrom.get(edge.from) ?? [];
    entries.push(edge);
    edgesByFrom.set(edge.from, entries);
  }
  const queue = directEdges.flatMap((edge) => (edge.to ? [edge.to] : []));
  const expanded = new Set<string>();
  const reachable = new Set(queue);
  const transitiveEdges: DependencyEdge[] = [];
  while (queue.length) {
    const from = queue.shift()!;
    if (expanded.has(from)) continue;
    expanded.add(from);
    for (const edge of edgesByFrom.get(from) ?? []) {
      transitiveEdges.push(edge);
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
    edges: [...directEdges, ...transitiveEdges],
  };
}

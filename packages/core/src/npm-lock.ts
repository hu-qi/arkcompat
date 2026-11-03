import type {
  DeclaredDependency,
  DependencyEdge,
  DependencyGraph,
  Limitation,
  LockedPackage,
} from "@arkcompat/contracts";
import { dependencies, publicSpecifier, record } from "./declarations.js";

function packageName(name: string): boolean {
  return (
    /^(?:@[a-zA-Z0-9._~-]+\/)?[a-zA-Z0-9._~-]+$/.test(name) &&
    name.split("/").every((part) => part !== "." && part !== "..")
  );
}
function safeLocation(path: string): boolean {
  return (
    path.length <= 2048 &&
    path
      .split("/")
      .every(
        (part) =>
          part.length > 0 &&
          part !== "." &&
          part !== ".." &&
          /^[a-zA-Z0-9@._~-]+$/.test(part),
      )
  );
}
function installName(path: string): string | null {
  if (!path.startsWith("node_modules/")) return null;
  const names = path.slice("node_modules/".length).split("/node_modules/");
  if (!names.every(packageName)) return null;
  return names.at(-1)!;
}
function parentLocation(path: string): string {
  const index = path.lastIndexOf("/node_modules/");
  return index < 0 ? "" : path.slice(0, index);
}
function effectiveDependencies(
  entries: DeclaredDependency[],
): DeclaredDependency[] {
  const optionalNames = new Set(
    entries
      .filter((d) => d.section === "optionalDependencies")
      .map((d) => d.name),
  );
  return entries.filter(
    (d) => d.section !== "dependencies" || !optionalNames.has(d.name),
  );
}
function lookup(
  from: string,
  name: string,
  peer: boolean,
  nodes: Map<string, LockedPackage>,
): LockedPackage | undefined {
  let current = peer ? parentLocation(from) : from;
  while (true) {
    const node = nodes.get(
      `${current ? current + "/" : ""}node_modules/${name}`,
    );
    if (node) return node;
    if (!current) return undefined;
    current = parentLocation(current);
  }
}

/** Pure metadata adapter: never follows a link or reads node_modules. */
export function npmGraph(
  text: string | null,
  source: DependencyGraph["source"],
  declared: DeclaredDependency[],
): { graph: DependencyGraph; limitations: Limitation[]; parsed: boolean } {
  const graph: DependencyGraph = {
    source,
    lockfileVersion: null,
    nodes: [],
    edges: [],
  };
  const limitations: Limitation[] = [];
  const fail = (detail: string): never => {
    throw new Error(`${source}: ${detail}`);
  };
  if (text === null)
    return {
      graph,
      parsed: false,
      limitations: [
        { code: "npm-lockfile-missing" },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  let lock: unknown;
  try {
    lock = JSON.parse(text);
  } catch {
    return fail("Invalid JSON");
  }
  if (
    !record(lock) ||
    !Number.isSafeInteger(lock.lockfileVersion) ||
    (lock.lockfileVersion as number) < 1
  )
    return fail("expected an object with a positive integer lockfileVersion");
  graph.lockfileVersion = lock.lockfileVersion as number;
  if (graph.lockfileVersion !== 2 && graph.lockfileVersion !== 3)
    return {
      graph,
      parsed: false,
      limitations: [
        { code: "unsupported-npm-lockfile-version", path: source! },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  if (!record(lock.packages) || !record(lock.packages[""]))
    return fail("expected packages and a root package record");
  const metadata = new Map<string, Record<string, unknown>>();
  const nodes = new Map<string, LockedPackage>();
  const keys = Object.keys(lock.packages).sort();
  if (keys.length > 10000) return fail("package count limit exceeded (10000)");
  for (const path of keys) {
    const pkg = lock.packages[path];
    if (!record(pkg)) return fail("package metadata must be an object");
    // Validate all declared edge sections, including skipped workspace records.
    dependencies(pkg, source!);
    if (path === "") continue;
    if (!safeLocation(path)) return fail("unsafe package location");
    const installed = installName(path);
    if (!installed) {
      if (path.startsWith("node_modules/"))
        return fail("invalid installed package location");
      limitations.push({ code: "workspace-package-not-analyzed", path });
      continue;
    }
    if (pkg.link !== undefined && typeof pkg.link !== "boolean")
      return fail("link must be boolean");
    if (
      pkg.version !== undefined &&
      (typeof pkg.version !== "string" || !pkg.version.trim())
    )
      return fail("package version must be a nonempty string");
    if (
      pkg.name !== undefined &&
      (typeof pkg.name !== "string" || !packageName(pkg.name))
    )
      return fail("invalid package name");
    const node: LockedPackage = {
      id: path,
      installName: installed,
      name: typeof pkg.name === "string" ? pkg.name : installed,
      version:
        typeof pkg.version === "string" ? publicSpecifier(pkg.version) : null,
      link: pkg.link === true,
    };
    graph.nodes.push(node);
    nodes.set(path, node);
    metadata.set(path, pkg);
    if (node.link)
      limitations.push({ code: "linked-package-not-analyzed", path });
    else if (node.version === null)
      limitations.push({ code: "package-version-missing", path });
  }
  const lockedRoot = dependencies(lock.packages[""], source!);
  if (
    JSON.stringify(effectiveDependencies(lockedRoot)) !==
    JSON.stringify(effectiveDependencies(declared))
  )
    limitations.push({ code: "manifest-lockfile-mismatch", path: source! });
  limitations.push(
    { code: "dependency-ranges-not-validated" },
    { code: "lockfile-install-state-not-verified" },
  );
  function addEdges(from: string, entries: DeclaredDependency[]) {
    for (const dependency of effectiveDependencies(entries)) {
      if (graph.edges.length >= 20000)
        return fail("edge count limit exceeded (20000)");
      if (!packageName(dependency.name)) return fail("invalid dependency name");
      const node = lookup(
        from,
        dependency.name,
        dependency.section === "peerDependencies",
        nodes,
      );
      const unsupported =
        /^(workspace:|file:|link:)/.test(dependency.specifier) ||
        node?.link ||
        (node && node.version === null);
      const edge: DependencyEdge = {
        from,
        name: dependency.name,
        specifier: publicSpecifier(dependency.specifier),
        section: dependency.section,
        to: node?.id ?? null,
        resolution: unsupported ? "unsupported" : node ? "locked" : "missing",
      };
      graph.edges.push(edge);
      if (edge.resolution !== "locked")
        limitations.push({
          code:
            edge.resolution === "missing"
              ? "dependency-edge-missing"
              : "dependency-edge-unsupported",
          path: from || "package.json",
        });
    }
  }
  addEdges("", declared);
  for (const node of graph.nodes) {
    if (!node.link)
      addEdges(
        node.id,
        dependencies(metadata.get(node.id)!, source!).filter(
          (d) => d.section !== "devDependencies",
        ),
      );
  }
  return { graph, limitations, parsed: true };
}

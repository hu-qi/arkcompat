import type {
  DeclaredDependency,
  DependencyEdge,
  DependencyGraph,
  Limitation,
  LockedPackage,
} from "@arkcompat/contracts";
import {
  dependencies,
  publicSpecifier,
  record,
  packageName,
  effectiveDependencies,
} from "./declarations.js";

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
  source: Exclude<DependencyGraph["source"], "pnpm-lock.yaml" | "yarn.lock">,
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
  const localLinks = new Map<string, string>();
  const localRoots = new Set<string>();
  for (const path of keys) {
    const pkg = lock.packages[path];
    if (
      !path.startsWith("node_modules/") ||
      !packageName(path.slice("node_modules/".length)) ||
      !record(pkg) ||
      pkg.link !== true ||
      typeof pkg.resolved !== "string" ||
      !safeLocation(pkg.resolved) ||
      pkg.resolved.split("/").includes("node_modules")
    )
      continue;
    const target = lock.packages[pkg.resolved];
    if (
      !record(target) ||
      (target.link !== undefined && target.link !== false) ||
      typeof target.version !== "string" ||
      !target.version.trim()
    )
      continue;
    localLinks.set(path, pkg.resolved);
    localRoots.add(pkg.resolved);
  }
  for (const path of keys) {
    const pkg = lock.packages[path];
    if (!record(pkg)) return fail("package metadata must be an object");
    // Validate all declared edge sections, including skipped workspace records.
    dependencies(pkg, source!);
    if (path === "") continue;
    if (!safeLocation(path)) return fail("unsafe package location");
    if (localRoots.has(path)) continue;
    const nested = path.indexOf("/node_modules/");
    const nestedLocalInstall =
      nested >= 0 && localRoots.has(path.slice(0, nested));
    const installed = installName(
      nestedLocalInstall ? path.slice(nested + 1) : path,
    );
    if (!installed) {
      if (nestedLocalInstall || path.startsWith("node_modules/"))
        return fail("invalid installed package location");
      limitations.push({ code: "workspace-package-not-analyzed", path });
      continue;
    }
    if (pkg.link !== undefined && typeof pkg.link !== "boolean")
      return fail("link must be boolean");
    const localRoot = localLinks.get(path);
    const descriptor = localRoot
      ? (lock.packages[localRoot] as Record<string, unknown>)
      : pkg;
    if (
      descriptor.version !== undefined &&
      (typeof descriptor.version !== "string" || !descriptor.version.trim())
    )
      return fail("package version must be a nonempty string");
    if (
      descriptor.name !== undefined &&
      (typeof descriptor.name !== "string" || !packageName(descriptor.name))
    )
      return fail("invalid package name");
    const node: LockedPackage = {
      id: path,
      installName: installed,
      name: typeof descriptor.name === "string" ? descriptor.name : installed,
      version:
        typeof descriptor.version === "string"
          ? publicSpecifier(descriptor.version)
          : null,
      link: pkg.link === true,
    };
    graph.nodes.push(node);
    nodes.set(path, node);
    metadata.set(path, descriptor);
    if (node.link)
      limitations.push({
        code: localRoot
          ? "local-link-target-metadata-only"
          : "linked-package-not-analyzed",
        path,
      });
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
  function addEdges(
    from: string,
    entries: DeclaredDependency[],
    location = from,
  ) {
    for (const dependency of effectiveDependencies(entries)) {
      if (graph.edges.length >= 20000)
        return fail("edge count limit exceeded (20000)");
      if (!packageName(dependency.name)) return fail("invalid dependency name");
      const node = lookup(
        location,
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
    const localRoot = localLinks.get(node.id);
    if (node.link && !localRoot) continue;
    addEdges(
      node.id,
      dependencies(metadata.get(node.id)!, source!).filter(
        (d) => localRoot || d.section !== "devDependencies",
      ),
      localRoot ?? node.id,
    );
  }
  return { graph, limitations, parsed: true };
}

import { parseDocument } from "yaml";
import type {
  DeclaredDependency,
  DependencyEdge,
  DependencyGraph,
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
const source = "yarn.lock";
function fail(detail: string): never {
  throw new Error(`${source}: ${detail}`);
}
function range(value: string) {
  return (
    value.length > 0 &&
    value.length <= 2048 &&
    value.trim().length > 0 &&
    /^[a-zA-Z0-9*^~<>=|.+ -]+$/.test(value)
  );
}
function descriptor(value: string) {
  const at = value.indexOf("@", 1);
  if (at < 1 || value.length > 2048) return null;
  const installName = value.slice(0, at);
  const selector = value.slice(at + 1);
  if (!packageName(installName) || !selector.startsWith("npm:")) return null;
  const registry = selector.slice(4);
  const aliasAt = registry.lastIndexOf("@");
  const name = aliasAt > 0 ? registry.slice(0, aliasAt) : installName;
  const versionRange = aliasAt > 0 ? registry.slice(aliasAt + 1) : registry;
  return packageName(name) && range(versionRange)
    ? { installName, name }
    : null;
}
function locator(value: string) {
  if (value.length > 2048) return null;
  const match =
    /^((?:@[a-zA-Z0-9._~-]+\/)?[a-zA-Z0-9._~-]+)@npm:(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)$/.exec(
      value,
    );
  return match && packageName(match[1]!)
    ? { name: match[1]!, version: match[2]! }
    : null;
}
function parse(text: string): Record<string, unknown> {
  for (const line of text.split(/\r?\n/)) {
    if (line.length > 16384) return fail("line length limit exceeded (16384)");
    if (/^[ \t]{129}/.test(line))
      return fail("indentation limit exceeded (128)");
    if (/^(?:<{7}|={7}|>{7}|\|{7})/.test(line))
      return fail("unresolved merge conflict");
  }
  try {
    const doc = parseDocument(text, {
      prettyErrors: false,
      uniqueKeys: true,
      stringKeys: true,
    });
    if (doc.errors.length || doc.warnings.length) throw new Error();
    const result: unknown = doc.toJS({ maxAliasCount: 0 });
    if (!record(result)) throw new Error();
    return result;
  } catch {
    return fail("Invalid or unsupported Berry YAML");
  }
}
function metaDependencies(entry: Record<string, unknown>) {
  const raw = entry.dependenciesMeta;
  if (raw === undefined) return new Set<string>();
  if (!record(raw)) return fail("dependenciesMeta must be a mapping");
  const optional = new Set<string>();
  for (const [name, value] of Object.entries(raw)) {
    if (
      !packageName(name) ||
      !record(value) ||
      (value.optional !== undefined && typeof value.optional !== "boolean")
    )
      return fail("invalid optional dependency metadata");
    if (value.optional === true) optional.add(name);
  }
  return optional;
}

/** v8 descriptor graph. Never loads Yarn configuration, plugins or install state. */
export function berryGraph(text: string, declared: DeclaredDependency[]) {
  const graph: DependencyGraph = {
    source,
    lockfileVersion: null,
    nodes: [],
    edges: [],
  };
  const limitations: Limitation[] = [];
  const lock = parse(text);
  if (
    !record(lock.__metadata) ||
    !Number.isSafeInteger(lock.__metadata.version) ||
    Number(lock.__metadata.version) < 1
  )
    return fail("invalid Berry metadata version");
  graph.lockfileVersion = Number(lock.__metadata.version);
  if (graph.lockfileVersion !== 8)
    return {
      graph,
      parsed: false,
      limitations: [
        { code: "unsupported-yarn-berry-lockfile-version", path: source },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  const nodes = new Map<string, LockedPackage>();
  const unsupportedSelectors = new Set<string>();
  const nodeEntries = new Map<string, Record<string, unknown>>();
  const selectors = new Set<string>();
  for (const key of Object.keys(lock)
    .filter((k) => k !== "__metadata")
    .sort()) {
    const entry = lock[key];
    if (
      !record(entry) ||
      typeof entry.resolution !== "string" ||
      !["hard", "soft"].includes(String(entry.linkType))
    )
      return fail("Berry entries require mapping, resolution and linkType");
    if (
      entry.version !== undefined &&
      (typeof entry.version !== "string" || !entry.version.trim())
    )
      return fail("invalid entry version");
    dependencies(entry, source);
    metaDependencies(entry);
    if (
      entry.conditions !== undefined &&
      entry.conditions !== null &&
      typeof entry.conditions !== "string"
    )
      return fail("invalid conditions");
    const identity = locator(entry.resolution);
    const keys = key.split(/, */);
    for (const selector of keys) {
      if (selectors.has(selector)) return fail("duplicate Berry descriptor");
      selectors.add(selector);
      if (selectors.size > 10000)
        return fail("selector count limit exceeded (10000)");
      const requested = descriptor(selector);
      if (!requested || !identity || entry.linkType !== "hard") {
        unsupportedSelectors.add(selector);
        limitations.push({
          code: "yarn-berry-protocol-not-analyzed",
          path: source,
        });
        continue;
      }
      if (
        requested.name !== identity.name ||
        (entry.version !== undefined && entry.version !== identity.version)
      )
        return fail("descriptor/locator identity mismatch");
      const node: LockedPackage = {
        id: `yarn-berry:${selector}`,
        installName: requested.installName,
        name: identity.name,
        version: typeof entry.version === "string" ? entry.version : null,
        link: false,
      };
      nodes.set(selector, node);
      nodeEntries.set(selector, entry);
      graph.nodes.push(node);
      if (node.version === null)
        limitations.push({ code: "package-version-missing", path: source });
      if (entry.conditions)
        limitations.push({
          code: "yarn-berry-conditions-not-evaluated",
          path: source,
        });
    }
  }
  function edge(from: string, dependency: DeclaredDependency) {
    if (graph.edges.length >= 20000)
      return fail("edge count limit exceeded (20000)");
    if (!packageName(dependency.name)) return fail("invalid dependency name");
    const selector = `${dependency.name}@${dependency.specifier.startsWith("npm:") ? dependency.specifier : `npm:${dependency.specifier}`}`;
    const supported =
      descriptor(selector) !== null &&
      dependency.section !== "peerDependencies" &&
      !unsupportedSelectors.has(selector);
    const node = supported ? nodes.get(selector) : undefined;
    const resolution: DependencyEdge["resolution"] =
      !supported || (node && node.version === null)
        ? "unsupported"
        : node
          ? "locked"
          : "missing";
    graph.edges.push({
      from,
      name: dependency.name,
      specifier: publicSpecifier(dependency.specifier),
      section: dependency.section,
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
  for (const dependency of effectiveDependencies(declared))
    edge("", dependency);
  for (const [selector, node] of nodes) {
    const entry = nodeEntries.get(selector)!;
    const optional = metaDependencies(entry);
    for (const dependency of effectiveDependencies(
      dependencies(entry, source),
    ).filter((d) => d.section !== "devDependencies")) {
      edge(
        node.id,
        optional.has(dependency.name) && dependency.section === "dependencies"
          ? { ...dependency, section: "optionalDependencies" }
          : dependency,
      );
    }
  }
  limitations.push(
    { code: "dependency-ranges-not-validated" },
    { code: "lockfile-install-state-not-verified" },
    { code: "yarn-peer-graph-not-recorded" },
    { code: "yarn-hoisting-not-recorded" },
    { code: "yarn-berry-workspaces-not-analyzed" },
  );
  return { graph, limitations, parsed: true };
}

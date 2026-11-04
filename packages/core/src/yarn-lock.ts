import { createRequire } from "node:module";
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
// The Classic parser is a CommonJS bundle with a Babel __esModule marker.
const lockfile: typeof import("@yarnpkg/lockfile") = createRequire(
  import.meta.url,
)("@yarnpkg/lockfile");
function fail(detail: string): never {
  throw new Error(`${source}: ${detail}`);
}
interface Descriptor {
  installName: string;
  name: string;
  specifier: string;
}
function registryRange(value: string): boolean {
  return (
    value.length > 0 &&
    /^[a-zA-Z0-9*^~<>=|.+ -]+$/.test(value) &&
    value.trim().length > 0
  );
}
/** Only registry descriptors are public IDs; remote/local selectors never enter reports. */
function descriptor(value: string): Descriptor | null {
  if (value.length > 2048) return null;
  const split = value.indexOf("@", 1);
  if (split < 1) return null;
  const installName = value.slice(0, split);
  const specifier = value.slice(split + 1);
  if (!packageName(installName)) return null;
  if (specifier.startsWith("npm:")) {
    const alias = specifier.slice(4);
    const separator = alias.lastIndexOf("@");
    const name = alias.slice(0, separator);
    if (
      separator < 1 ||
      !packageName(name) ||
      !registryRange(alias.slice(separator + 1))
    )
      return null;
    return { installName, name, specifier };
  }
  return registryRange(specifier)
    ? { installName, name: installName, specifier }
    : null;
}
function parsedObject(text: string): Record<string, unknown> {
  try {
    const result = lockfile.parse(text, source);
    if (result.type !== "success" || !record(result.object))
      return fail("conflicted or invalid Classic input");
    return result.object;
  } catch {
    // The official parser can include raw tokens in errors; expose only a filename-level diagnostic.
    return fail("Invalid or conflicted Yarn Classic input");
  }
}
function checkHeaders(lines: string[]): void {
  const selectors = new Set<string>();
  for (const line of lines) {
    if (line.length > 16384) return fail("line length limit exceeded (16384)");
    if (/^[ \t]{129}/.test(line))
      return fail("indentation limit exceeded (128)");
    if (/^(?:<{7}|={7}|>{7}|\|{7})/.test(line))
      return fail("unresolved merge conflict");
    if (!line.trim() || /^[ \t#]/.test(line)) continue;
    if (!line.endsWith(":")) return fail("expected a Classic selector header");
    // Use the same official grammar for grouped/quoted selectors, not a comma-split approximation.
    const header = parsedObject(`${line}\n  version "0.0.0"\n`);
    for (const selector of Object.keys(header)) {
      if (selectors.has(selector))
        return fail("duplicate selector across Classic entries");
      selectors.add(selector);
      if (selectors.size > 10000)
        return fail("selector count limit exceeded (10000)");
    }
  }
}

/** Logical selector graph only: Classic does not record the final hoisted installation tree. */
export function yarnGraph(
  input: string,
  declared: DeclaredDependency[],
): { graph: DependencyGraph; limitations: Limitation[]; parsed: boolean } {
  const graph: DependencyGraph = {
    source,
    lockfileVersion: null,
    nodes: [],
    edges: [],
  };
  const limitations: Limitation[] = [];
  const text = input.replace(/^\uFEFF/, "");
  const headers = [...text.matchAll(/^#\s*yarn lockfile v(\d+)\s*$/gm)];
  if (headers.length === 0)
    return {
      graph,
      parsed: false,
      limitations: [
        {
          code: /^__metadata\s*:/m.test(text)
            ? "unsupported-yarn-berry-lockfile"
            : "unrecognized-yarn-lockfile-format",
          path: source,
        },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  if (headers.length !== 1) return fail("expected one Classic format header");
  graph.lockfileVersion = Number(headers[0]![1]);
  if (!Number.isSafeInteger(graph.lockfileVersion) || graph.lockfileVersion < 1)
    return fail("invalid Classic lockfileVersion");
  if (graph.lockfileVersion !== 1)
    return {
      graph,
      parsed: false,
      limitations: [
        { code: "unsupported-yarn-lockfile-version", path: source },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  const lines = text.split(/\r?\n/);
  checkHeaders(lines);
  const entries = parsedObject(text);
  const keys = Object.keys(entries).sort();
  if (keys.length > 10000) return fail("selector count limit exceeded (10000)");
  const nodes = new Map<string, LockedPackage>();
  for (const key of keys) {
    const entry = entries[key];
    if (!record(entry)) return fail("Classic entry must be a mapping");
    dependencies(entry, source);
    if (
      entry.version !== undefined &&
      (typeof entry.version !== "string" || !entry.version.trim())
    )
      return fail("entry version must be a nonempty string");
    const parsed = descriptor(key);
    if (!parsed) {
      limitations.push({ code: "yarn-selector-unsupported", path: source });
      continue;
    }
    const node: LockedPackage = {
      id: `yarn:${key}`,
      installName: parsed.installName,
      name: parsed.name,
      version:
        typeof entry.version === "string"
          ? publicSpecifier(entry.version)
          : null,
      link: false,
    };
    graph.nodes.push(node);
    nodes.set(key, node);
    if (node.version === null)
      limitations.push({ code: "package-version-missing", path: source });
  }
  function edge(from: string, dependency: DeclaredDependency) {
    if (graph.edges.length >= 20000)
      return fail("edge count limit exceeded (20000)");
    if (!packageName(dependency.name)) return fail("invalid dependency name");
    const key = `${dependency.name}@${dependency.specifier}`;
    const supported =
      descriptor(key) !== null && dependency.section !== "peerDependencies";
    const node = supported ? nodes.get(key) : undefined;
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
  for (const [key, node] of nodes) {
    for (const dependency of effectiveDependencies(
      dependencies(entries[key], source),
    ).filter((d) => d.section !== "devDependencies"))
      edge(node.id, dependency);
  }
  limitations.push(
    { code: "dependency-ranges-not-validated" },
    { code: "lockfile-install-state-not-verified" },
    { code: "yarn-peer-graph-not-recorded" },
    { code: "yarn-hoisting-not-recorded" },
  );
  return { graph, limitations, parsed: true };
}

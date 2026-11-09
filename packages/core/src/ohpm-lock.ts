import { createHash } from "node:crypto";
import JSON5 from "json5";
import type {
  DeclaredDependency,
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

const source = "oh-package-lock.json5";
const versionPattern =
  /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/;

function fail(detail: string): never {
  throw new Error(`${source}: ${detail}`);
}
export function publicOhpmSpecifier(value: string) {
  const sanitized = publicSpecifier(value);
  return sanitized === value && /[\\/]/.test(value)
    ? "[local-reference]"
    : sanitized;
}

export function ohpmGraph(text: string, declared: DeclaredDependency[]) {
  let lock: unknown;
  try {
    lock = JSON5.parse(text);
  } catch {
    return fail("invalid JSON5");
  }
  if (
    !record(lock) ||
    !Number.isSafeInteger(lock.lockfileVersion) ||
    Number(lock.lockfileVersion) < 1
  )
    return fail("invalid lockfileVersion");
  const graph: DependencyGraph = {
    source,
    lockfileVersion: Number(lock.lockfileVersion),
    nodes: [],
    edges: [],
  };
  function unparsed(code: string) {
    return {
      graph,
      parsed: false,
      limitations: [
        { code, path: source },
        { code: "transitive-dependencies-not-analyzed" },
      ],
    };
  }
  if (graph.lockfileVersion !== 3)
    return unparsed("unsupported-ohpm-lockfile-version");
  if (record(lock.meta) && lock.meta.enableUnifiedLockfile === true)
    return unparsed("unified-ohpm-lockfile-not-analyzed");
  if (!record(lock.specifiers) || !record(lock.packages))
    return fail("expected specifiers and packages mappings");
  const keys = Object.keys(lock.packages).sort();
  const selectors = Object.entries(lock.specifiers);
  if (keys.length > 10000 || selectors.length > 20000)
    return fail("package or selector count limit exceeded");
  const byKey = new Map<string, LockedPackage>();
  const ignored = new Set<string>();
  const edges = new Map<string, DeclaredDependency[]>();
  const codes = new Set<string>([
    "dependency-ranges-not-validated",
    "lockfile-install-state-not-verified",
  ]);
  for (const key of keys) {
    const entry = lock.packages[key];
    if (
      !record(entry) ||
      typeof entry.name !== "string" ||
      !packageName(entry.name) ||
      key.length > 2048
    )
      return fail("invalid package record");
    const expectedPrefix = entry.name + "@";
    const suffix = key.startsWith(expectedPrefix)
      ? key.slice(expectedPrefix.length)
      : "";
    if (entry.registryType === "ohpm" && versionPattern.test(suffix)) {
      if (entry.version !== undefined && entry.version !== suffix)
        return fail("package version disagrees with its locator");
      byKey.set(key, {
        id: key,
        name: entry.name,
        installName: entry.name,
        version: suffix,
        link: false,
      });
      edges.set(
        key,
        dependencies(entry, source).filter(
          (d) => d.section !== "devDependencies",
        ),
      );
      if (entry.dynamicDependencies !== undefined)
        codes.add("ohpm-dynamic-dependencies-not-analyzed");
    } else if (
      entry.registryType === "local" &&
      suffix &&
      typeof entry.version === "string" &&
      versionPattern.test(entry.version)
    ) {
      const id = "ohpm:local:" + createHash("sha256").update(key).digest("hex");
      byKey.set(key, {
        id,
        name: entry.name,
        installName: entry.name,
        version: entry.version,
        link: true,
      });
      codes.add("local-ohpm-reference-not-verified");
    } else {
      ignored.add(key);
      codes.add("ohpm-package-record-not-analyzed");
    }
  }
  const bySelector = new Map<string, string>();
  for (const [key, value] of selectors) {
    if (
      !key ||
      key.length > 2048 ||
      typeof value !== "string" ||
      !value ||
      value.length > 2048
    )
      return fail("invalid specifier record");
    bySelector.set(key, value);
  }
  graph.nodes = [...byKey.values()];
  function addEdges(from: string, entries: DeclaredDependency[]) {
    for (const dependency of effectiveDependencies(entries)) {
      if (graph.edges.length >= 20000) return fail("edge count limit exceeded");
      const key = bySelector.get(
        dependency.name + "@" + dependency.specifier.replace(/^file:/, ""),
      );
      const node = key === undefined ? undefined : byKey.get(key);
      const matching = node?.name === dependency.name ? node : undefined;
      const unsupported =
        (key !== undefined && ignored.has(key)) ||
        (node && !matching) ||
        matching?.link ||
        publicOhpmSpecifier(dependency.specifier) !== dependency.specifier;
      const resolution = unsupported
        ? "unsupported"
        : matching
          ? "locked"
          : "missing";
      graph.edges.push({
        from,
        name: dependency.name,
        section: dependency.section,
        specifier: publicOhpmSpecifier(dependency.specifier),
        to: matching?.id ?? null,
        resolution,
      });
      if (resolution !== "locked") codes.add(`dependency-edge-${resolution}`);
    }
  }
  addEdges("", declared);
  for (const [key, entries] of edges) addEdges(byKey.get(key)!.id, entries);
  const limitations: Limitation[] = [...codes].map((code) => ({
    code,
    path: source,
  }));
  return { graph, parsed: true, limitations };
}

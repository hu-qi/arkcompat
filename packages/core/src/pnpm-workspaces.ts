import { parseDocument } from "yaml";
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
import { pnpmImporterGraph, type PnpmImporterRecord } from "./pnpm-lock.js";
import { discoverWorkspaceManifests } from "./workspace-discovery.js";

const workspaceFile = "pnpm-workspace.yaml";

interface WorkspaceOptions {
  root: string;
  text: string | null;
  graph: DependencyGraph;
  importers: PnpmImporterRecord[];
  parsed: boolean;
  excluded: ReadonlySet<string>;
  read: (path: string) => Promise<string>;
}

function workspacePackages(text: string): string[] {
  let config: unknown;
  try {
    const document = parseDocument(text, {
      prettyErrors: false,
      uniqueKeys: true,
      stringKeys: true,
    });
    if (document.errors.length || document.warnings.length) throw new Error();
    config = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new Error(
      `${workspaceFile}: Invalid or unsupported YAML (aliases, tags, duplicate keys and multiple documents are not accepted)`,
    );
  }
  if (!record(config)) throw new Error(`${workspaceFile}: expected an object`);
  if (config.packages === undefined) return [];
  if (
    !Array.isArray(config.packages) ||
    !config.packages.every((entry) => typeof entry === "string" && entry.trim())
  )
    throw new Error(
      `${workspaceFile}: packages must be an array of nonempty strings`,
    );
  return config.packages as string[];
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

function declarationsMatchManifest(
  importer: PnpmImporterRecord,
  declared: ReturnType<typeof effectiveDependencies>,
) {
  const consumed = new Set<string>();
  let mismatch = false;
  for (const dependency of declared) {
    const section =
      dependency.section === "peerDependencies"
        ? "dependencies"
        : dependency.section;
    const key = JSON.stringify([section, dependency.name]);
    const entry = importer.entries.get(key);
    if (!entry || entry.specifier !== dependency.specifier) mismatch = true;
    consumed.add(key);
  }
  return (
    !mismatch &&
    consumed.size === importer.entries.size &&
    [...importer.entries.keys()].every((key) => consumed.has(key))
  );
}

export async function scanPnpmWorkspaces(options: WorkspaceOptions): Promise<{
  modules: { inventory: ModuleInventory; manifestText: string }[];
  limitations: Limitation[];
}> {
  if (options.text === null) {
    return {
      modules: [],
      limitations: options.importers
        .filter((importer) => importer.path !== ".")
        .map((importer) => ({
          code: "workspace-importer-not-analyzed",
          path: importer.path,
        })),
    };
  }
  const entries = workspacePackages(options.text);
  const discovery = await discoverWorkspaceManifests({
    root: options.root,
    entries,
    excluded: options.excluded,
    read: options.read,
    codePrefix: "pnpm-workspace",
  });
  const limitations = [...discovery.limitations];
  const seenLimitations = new Set(
    limitations.map((item) => JSON.stringify(item)),
  );
  const importers = new Map(
    options.importers.map((importer) => [importer.path, importer]),
  );
  for (const importer of options.importers)
    if (importer.path !== "." && !discovery.paths.has(importer.path))
      addLimitation(limitations, seenLimitations, {
        code: "pnpm-workspace-importer-not-selected",
        path: importer.path,
      });
  const modules: { inventory: ModuleInventory; manifestText: string }[] = [];
  for (const workspace of discovery.manifests) {
    const inventory: ModuleInventory = {
      kind: "pnpm",
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
    const importer = importers.get(workspace.path);
    if (!workspace.name) {
      // Discovery already reports the missing identity.
    } else if (!workspace.version) {
      addLimitation(limitations, seenLimitations, {
        code: "pnpm-workspace-version-missing",
        path: workspace.manifestPath,
      });
    } else if (discovery.duplicateNames.has(workspace.name)) {
      // Duplicate workspace names make workspace-link attribution ambiguous.
    } else if (!options.parsed) {
      addLimitation(limitations, seenLimitations, {
        code: "pnpm-workspace-lock-not-parsed",
        path: workspace.manifestPath,
      });
    } else if (!importer) {
      addLimitation(limitations, seenLimitations, {
        code: "pnpm-workspace-importer-missing",
        path: workspace.manifestPath,
      });
    } else if (
      !declarationsMatchManifest(
        importer,
        effectiveDependencies(workspace.dependencies),
      )
    ) {
      addLimitation(limitations, seenLimitations, {
        code: "pnpm-workspace-manifest-lock-mismatch",
        path: workspace.manifestPath,
      });
    } else {
      inventory.dependencyGraph = pnpmImporterGraph(
        options.graph,
        importer,
        workspace.dependencies,
      );
      inventory.coverage = "pnpm-lockfile-partial";
      for (const edge of inventory.dependencyGraph.edges)
        if (edge.resolution !== "locked")
          addLimitation(limitations, seenLimitations, {
            code:
              edge.resolution === "missing"
                ? "dependency-edge-missing"
                : "dependency-edge-unsupported",
            path: workspace.manifestPath,
          });
    }
    modules.push({ inventory, manifestText: workspace.text });
  }
  return { modules, limitations };
}

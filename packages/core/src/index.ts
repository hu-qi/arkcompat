import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, readdir, realpath } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import ts from "typescript";
import JSON5 from "json5";
export { apiRuleSnapshotByteLimit, evaluateApiRules } from "./api-rules.js";
export { explainFinding } from "./explanations.js";
export { formatReport } from "./reports.js";
export type { ReportFormat } from "./reports.js";
import { readOhpmProfile, scanOhpmModules } from "./ohpm-modules.js";
import { readOhpmLock, publicOhpmSpecifier } from "./ohpm-lock.js";
import { analyzeSource } from "./source.js";
import { dependencies, publicSpecifier, record } from "./declarations.js";
import {
  selectLockfile,
  parseDependencyGraph,
  graphCoverage,
} from "./lockfiles.js";
import type {
  Finding,
  Limitation,
  ModuleReference,
  ApiUsage,
  ScanReport,
  TargetProfile,
} from "@arkcompat/contracts";

const excluded = new Set([
  "node_modules",
  "oh_modules",
  "dist",
  "build",
  "coverage",
  "vendor",
]);
const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".mts",
  ".cjs",
  ".cts",
]);
const lockfiles = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "oh-package-lock.json5",
]);
const maxFileBytes = 1024 * 1024;
const maxTotalBytes = 32 * maxFileBytes;

function declarationLocations(
  filename: string,
  text: string,
): Map<string, Finding["location"]> {
  const source = ts.parseJsonText(filename, text);
  const locations = new Map<string, Finding["location"]>();
  const statement = source.statements[0];
  if (
    !statement ||
    !ts.isExpressionStatement(statement) ||
    !ts.isObjectLiteralExpression(statement.expression)
  )
    return locations;
  for (const section of statement.expression.properties) {
    if (
      !ts.isPropertyAssignment(section) ||
      (!ts.isStringLiteral(section.name) && !ts.isIdentifier(section.name)) ||
      !ts.isObjectLiteralExpression(section.initializer)
    )
      continue;
    for (const property of section.initializer.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isStringLiteral(property.name) && !ts.isIdentifier(property.name))
      )
        continue;
      const position = source.getLineAndCharacterOfPosition(
        property.name.getStart(source),
      );
      locations.set(JSON.stringify([section.name.text, property.name.text]), {
        path: filename,
        line: position.line + 1,
        column: position.character + 1,
      });
    }
  }
  return locations;
}
function validateTarget(target: TargetProfile): void {
  if (
    target.os !== "HarmonyOS" ||
    !/^\d+\.\d+\.\d+$/.test(target.release) ||
    !["arkts", "arkweb", "react-native"].includes(target.runtime) ||
    (target.apiLevel !== undefined &&
      (!Number.isSafeInteger(target.apiLevel) || target.apiLevel < 1))
  ) {
    throw new Error(
      "Invalid target: supply HarmonyOS release x.y.z, runtime and optional positive integer apiLevel",
    );
  }
}

/** Inventory only: never install packages, resolve imports online, or execute source. */
export async function scanProject(
  projectPath: string,
  inputTarget: TargetProfile,
): Promise<ScanReport> {
  validateTarget(inputTarget);
  const target = { ...inputTarget };
  const root = await realpath(projectPath);
  let totalBytes = 0;
  let visitedEntries = 0;
  async function read(path: string) {
    const label = relative(root, path).split(sep).join("/");
    let file;
    try {
      file = await open(
        path,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
      const stat = await file.stat();
      if (
        !stat.isFile() ||
        stat.size > maxFileBytes ||
        totalBytes + stat.size > maxTotalBytes
      )
        throw new Error("limit");
      // Bounded read even if a file grows while being scanned.
      const buffer = Buffer.alloc(maxFileBytes + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await file.read(
          buffer,
          length,
          buffer.length - length,
          null,
        );
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      totalBytes += length;
      if (length > maxFileBytes || totalBytes > maxTotalBytes)
        throw new Error("limit");
      return buffer.subarray(0, length).toString("utf8");
    } catch {
      throw new Error(
        `Cannot read ${label}: expected a regular non-symlink file within scan limits`,
      );
    } finally {
      await file?.close();
    }
  }
  let manifest: unknown;
  const rootEntries = await readdir(root);
  const hasOhpmManifest = rootEntries.includes("oh-package.json5");
  const ohpm = hasOhpmManifest && !rootEntries.includes("package.json");
  const manifestName = ohpm ? "oh-package.json5" : "package.json";
  const manifestText = await read(join(root, manifestName));
  try {
    manifest = ohpm ? JSON5.parse(manifestText) : JSON.parse(manifestText);
  } catch {
    throw new Error(`Invalid ${ohpm ? "JSON5" : "JSON"} in ${manifestName}`);
  }
  const rawDeclared = dependencies(manifest, manifestName);
  const declared = rawDeclared.map((d) => ({
    ...d,
    specifier: (ohpm ? publicOhpmSpecifier : publicSpecifier)(d.specifier),
  }));
  const locations = declarationLocations(manifestName, manifestText);
  const moduleReferences: ModuleReference[] = [];
  const apiUsages: ApiUsage[] = [];
  const limitations: Limitation[] = [
    { code: "compatibility-not-evaluated" },
    { code: "commonjs-exports-not-analyzed" },
    { code: "global-apis-not-analyzed" },
    { code: "module-mutations-and-returned-values-not-analyzed" },
    { code: "gitignore-not-applied" },
    { code: "excluded-directories-not-analyzed" },
  ];
  if (
    ohpm &&
    record(manifest) &&
    Object.hasOwn(manifest, "dynamicDependencies")
  )
    limitations.push({
      code: "ohpm-dynamic-dependencies-not-analyzed",
      path: manifestName,
    });
  if (!ohpm && hasOhpmManifest)
    limitations.push({
      code: "ohpm-manifest-not-analyzed",
      path: "oh-package.json5",
    });
  const source = ohpm
    ? rootEntries.includes("oh-package-lock.json5")
      ? "oh-package-lock.json5"
      : null
    : selectLockfile(rootEntries, manifest);
  const profile =
    ohpm && rootEntries.includes("build-profile.json5")
      ? readOhpmProfile(await read(join(root, "build-profile.json5")))
      : undefined;
  const text = source ? await read(join(root, source)) : null;
  const ohpmLock =
    source === "oh-package-lock.json5"
      ? readOhpmLock(text!, Array.isArray(profile?.modules))
      : undefined;
  const {
    graph: dependencyGraph,
    limitations: graphLimitations,
    parsed,
  } = source === "oh-package-lock.json5"
    ? ohpmLock!.graphFor(rawDeclared)
    : parseDependencyGraph(text, source, rawDeclared);
  if (ohpm && source === null)
    limitations.push({ code: "transitive-dependencies-not-analyzed" });
  else limitations.push(...graphLimitations);
  const modules = profile
    ? await scanOhpmModules(root, read, excluded, profile, ohpmLock)
    : undefined;
  const moduleFiles = new Set<string>();
  if (modules) {
    limitations.push(...modules.limitations);
    for (const { inventory } of modules.modules) {
      moduleFiles.add(inventory.path + "/oh-package.json5");
      if (inventory.dependencyGraph.source)
        moduleFiles.add(
          inventory.path + "/" + inventory.dependencyGraph.source,
        );
    }
  }
  let sourceFiles = 0;
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 64) throw new Error("Scan directory depth limit exceeded (64)");
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (++visitedEntries > 10000)
        throw new Error("Scan entry limit exceeded (10000)");
      const full = join(dir, entry.name);
      const path = relative(root, full).split(sep).join("/");
      if (entry.isSymbolicLink()) {
        limitations.push({ code: "symlink-skipped", path });
        continue;
      }
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !excluded.has(entry.name))
          await walk(full, depth + 1);
      } else if (entry.isFile()) {
        if (
          dir !== root &&
          !moduleFiles.has(path) &&
          (entry.name === "package.json" || entry.name === "oh-package.json5")
        )
          limitations.push({ code: "nested-manifest-not-analyzed", path });
        const ohpmLock =
          entry.name === "oh-package-lock.json5" ||
          /^oh-package-[A-Za-z0-9._-]+-lock\.json5$/.test(entry.name);
        if (
          (lockfiles.has(entry.name) || ohpmLock) &&
          !moduleFiles.has(path) &&
          !(dir === root && entry.name === source)
        )
          limitations.push({
            code:
              ohpm && ohpmLock
                ? "ohpm-lockfile-not-analyzed"
                : dir === root &&
                    source === "npm-shrinkwrap.json" &&
                    entry.name === "package-lock.json"
                  ? "lockfile-ignored-by-shrinkwrap"
                  : "lockfile-not-analyzed",
            path,
          });
        if (extname(entry.name) === ".ets")
          limitations.push({ code: "unsupported-ets", path });
        if (sourceExtensions.has(extname(entry.name))) {
          const analyzed = analyzeSource(await read(full), path);
          moduleReferences.push(...analyzed.references);
          apiUsages.push(...analyzed.apiUsages);
          limitations.push(...analyzed.limitations);
          sourceFiles++;
        }
      } else {
        limitations.push({ code: "special-file-skipped", path });
      }
    }
  }
  await walk(root, 0);
  const findings: Finding[] = [];
  function finding(
    ruleId: Finding["ruleId"],
    location: Finding["location"],
    value: string | null,
    discriminator: string,
  ) {
    const id = createHash("sha256")
      .update(JSON.stringify([ruleId, location, discriminator]))
      .digest("hex");
    findings.push({
      id,
      ruleId,
      status: "unknown",
      tier: "rule-static",
      severity: "info",
      target,
      location,
      evidence: [
        {
          kind:
            ruleId === "inventory.dependency"
              ? "manifest-declaration"
              : ruleId === "inventory.api-usage"
                ? "module-api-access"
                : "ast-module-reference",
          value,
        },
      ],
      explanation:
        "Inventory evidence only; compatibility has not been evaluated. No rules or knowledge snapshot loaded.",
    });
  }
  function declareFindings(
    declarations: ScanReport["dependencies"],
    foundLocations: ReturnType<typeof declarationLocations>,
    filename: string,
  ) {
    for (const dependency of declarations) {
      const location = foundLocations.get(
        JSON.stringify([dependency.section, dependency.name]),
      );
      if (!location)
        throw new Error(`Cannot locate dependency declaration in ${filename}`);
      finding(
        "inventory.dependency",
        location,
        dependency.name,
        JSON.stringify(dependency),
      );
    }
  }
  declareFindings(declared, locations, manifestName);
  for (const module of modules?.modules ?? []) {
    const filename = module.inventory.path + "/oh-package.json5";
    declareFindings(
      module.inventory.dependencies,
      declarationLocations(filename, module.manifestText),
      filename,
    );
  }
  for (const reference of moduleReferences)
    finding(
      "inventory.module-reference",
      reference.location,
      reference.specifier,
      reference.kind,
    );
  for (const usage of apiUsages)
    finding(
      "inventory.api-usage",
      usage.location,
      JSON.stringify([usage.module, usage.path, usage.kind]),
      JSON.stringify(usage),
    );
  return {
    schemaVersion: "0.8.0",
    scannerVersion: "0.0.0",
    snapshots: { rules: "none", knowledge: "none" },
    target,
    dependencies: declared,
    dependencyGraph,
    ...(modules?.modules.length
      ? { modules: modules.modules.map((module) => module.inventory) }
      : {}),
    references: moduleReferences,
    apiUsages,
    findings,
    coverage: {
      dependencyGraph: graphCoverage(
        source,
        parsed,
        dependencyGraph.lockfileVersion,
      ),
      compatibility: "not-evaluated",
      sourceFiles,
      limitations,
    },
  };
}

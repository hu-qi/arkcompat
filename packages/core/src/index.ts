import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, readdir, realpath } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import ts from "typescript";
import type {
  DeclaredDependency,
  DependencySection,
  Finding,
  Limitation,
  ModuleReference,
  ScanReport,
  TargetProfile,
} from "@arkcompat/contracts";

const sections: DependencySection[] = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const excluded = new Set([
  "node_modules",
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

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function publicSpecifier(value: string): string {
  // URL declarations may contain registry credentials or signed query parameters.
  if (/:\/\//.test(value) || /^(git@|github:|gitlab:|bitbucket:)/.test(value))
    return "[redacted-url]";
  if (/^(file:|link:|\/|[A-Za-z]:\\)/.test(value)) return "[local-reference]";
  return value;
}
function dependencies(manifest: unknown): DeclaredDependency[] {
  if (!record(manifest)) throw new Error("package.json must contain an object");
  return sections.flatMap((section) => {
    const entries = manifest[section];
    if (entries === undefined) return [];
    if (!record(entries))
      throw new Error(`package.json ${section} must be an object`);
    return Object.keys(entries)
      .sort()
      .map((name) => {
        const specifier = entries[name];
        if (typeof specifier !== "string" || !specifier.trim())
          throw new Error(
            `package.json ${section} contains an invalid dependency specifier`,
          );
        return {
          name,
          specifier: publicSpecifier(specifier),
          section,
          status: "unknown",
        };
      });
  });
}
function declarationLocations(text: string): Map<string, Finding["location"]> {
  const source = ts.parseJsonText("package.json", text);
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
      !ts.isStringLiteral(section.name) ||
      !ts.isObjectLiteralExpression(section.initializer)
    )
      continue;
    for (const property of section.initializer.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        !ts.isStringLiteral(property.name)
      )
        continue;
      const position = source.getLineAndCharacterOfPosition(
        property.name.getStart(source),
      );
      locations.set(JSON.stringify([section.name.text, property.name.text]), {
        path: "package.json",
        line: position.line + 1,
        column: position.character + 1,
      });
    }
  }
  return locations;
}
function references(text: string, path: string): ModuleReference[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  // createProgram reports syntax diagnostics without resolving imports or reading disk.
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === path ? source : undefined),
    getDefaultLibFileName: () => "",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (name) => name === path,
    readFile: () => undefined,
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const program = ts.createProgram(
    [path],
    { noLib: true, noResolve: true, allowJs: true, checkJs: false },
    host,
  );
  const errors = program.getSyntacticDiagnostics(source);
  if (errors.length) {
    const error = errors[0]!;
    const position = source.getLineAndCharacterOfPosition(error.start ?? 0);
    throw new Error(
      `${path}:${position.line + 1}:${position.character + 1}: source syntax error (${error.code})`,
    );
  }
  const found: ModuleReference[] = [];
  function add(
    node: ts.Node,
    kind: ModuleReference["kind"],
    specifier: ts.Expression | undefined,
  ) {
    const position = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    found.push({
      kind,
      specifier:
        specifier && ts.isStringLiteralLike(specifier)
          ? publicSpecifier(specifier.text)
          : null,
      location: {
        path,
        line: position.line + 1,
        column: position.character + 1,
      },
    });
  }
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) add(node, "import", node.moduleSpecifier);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier)
      add(node, "export", node.moduleSpecifier);
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      add(node, "dynamic-import", node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
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
  const manifestText = await read(join(root, "package.json"));
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error("Invalid JSON in package.json");
  }
  const declared = dependencies(manifest);
  const locations = declarationLocations(manifestText);
  const moduleReferences: ModuleReference[] = [];
  const limitations: Limitation[] = [
    { code: "compatibility-not-evaluated" },
    { code: "transitive-dependencies-not-analyzed" },
    { code: "commonjs-not-analyzed" },
    { code: "import-types-not-analyzed" },
    { code: "gitignore-not-applied" },
    { code: "excluded-directories-not-analyzed" },
  ];
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
        if (entry.name === "package.json" && dir !== root)
          limitations.push({ code: "nested-manifest-not-analyzed", path });
        if (lockfiles.has(entry.name))
          limitations.push({ code: "lockfile-not-analyzed", path });
        if (extname(entry.name) === ".ets")
          limitations.push({ code: "unsupported-ets", path });
        if (sourceExtensions.has(extname(entry.name))) {
          moduleReferences.push(...references(await read(full), path));
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
              : "ast-module-reference",
          value,
        },
      ],
      explanation:
        "Inventory evidence only; compatibility has not been evaluated. No rules or knowledge snapshot loaded.",
    });
  }
  for (const dependency of declared)
    finding(
      "inventory.dependency",
      locations.get(JSON.stringify([dependency.section, dependency.name]))!,
      dependency.name,
      JSON.stringify(dependency),
    );
  for (const reference of moduleReferences)
    finding(
      "inventory.module-reference",
      reference.location,
      reference.specifier,
      reference.kind,
    );
  return {
    schemaVersion: "0.1.0",
    scannerVersion: "0.0.0",
    snapshots: { rules: "none", knowledge: "none" },
    target,
    dependencies: declared,
    references: moduleReferences,
    findings,
    coverage: {
      dependencyGraph: "declarations-only",
      compatibility: "not-evaluated",
      sourceFiles,
      limitations,
    },
  };
}

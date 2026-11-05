import ts from "typescript";
import type {
  ApiUsage,
  Limitation,
  ModuleReference,
  SourceLocation,
} from "@arkcompat/contracts";
import { publicSpecifier } from "./declarations.js";

interface Binding {
  module: string;
  path: string[];
}
function unwrap(expression: ts.Expression): ts.Expression {
  let value = expression;
  while (
    ts.isParenthesizedExpression(value) ||
    ts.isAsExpression(value) ||
    ts.isTypeAssertionExpression(value) ||
    ts.isNonNullExpression(value) ||
    ts.isSatisfiesExpression(value)
  )
    value = value.expression;
  return value;
}

/** All compiler reads are isolated to this supplied source file; no import resolution or project loading. */
export function analyzeSource(
  text: string,
  path: string,
): {
  references: ModuleReference[];
  apiUsages: ApiUsage[];
  limitations: Limitation[];
} {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
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
    const pos = source.getLineAndCharacterOfPosition(error.start ?? 0);
    throw new Error(
      `${path}:${pos.line + 1}:${pos.character + 1}: source syntax error (${error.code})`,
    );
  }
  const checker = program.getTypeChecker();
  const references: ModuleReference[] = [];
  const apiUsages: ApiUsage[] = [];
  const limitations: Limitation[] = [];
  const codes = new Set<string>();
  const bindings = new Map<ts.Symbol, Binding>();
  function limitation(code: string) {
    if (!codes.has(code)) {
      codes.add(code);
      limitations.push({ code, path });
    }
  }
  function location(node: ts.Node): SourceLocation {
    const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
    return { path, line: pos.line + 1, column: pos.character + 1 };
  }
  function literal(node: ts.Node | undefined): string | null {
    return node && ts.isStringLiteralLike(node)
      ? publicSpecifier(node.text)
      : null;
  }
  function reference(
    node: ts.Node,
    kind: ModuleReference["kind"],
    specifier: ts.Node | undefined,
  ) {
    references.push({
      kind,
      specifier: literal(specifier),
      location: location(node),
    });
  }
  function commonRequire(node: ts.Node): node is ts.CallExpression {
    if (
      !ts.isCallExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      node.expression.text !== "require"
    )
      return false;
    // JS/CommonJS gets a synthesized require symbol without declarations.
    // Any actual declaration (including a parameter) makes loader identity uncertain.
    return !checker.getSymbolAtLocation(node.expression)?.declarations?.length;
  }
  function bind(name: ts.Identifier, value: Binding) {
    const symbol = checker.getSymbolAtLocation(name);
    if (symbol) bindings.set(symbol, value);
  }
  function access(input: ts.Expression): Binding | undefined {
    const value = unwrap(input);
    if (ts.isIdentifier(value)) {
      const symbol = checker.getSymbolAtLocation(value);
      return symbol ? bindings.get(symbol) : undefined;
    }
    if (ts.isPropertyAccessExpression(value)) {
      const base = access(value.expression);
      return base
        ? { module: base.module, path: [...base.path, value.name.text] }
        : undefined;
    }
    if (ts.isElementAccessExpression(value)) {
      if (access(value.expression))
        limitation("computed-module-member-not-analyzed");
      return undefined;
    }
    if (commonRequire(value)) {
      const module = literal(value.arguments[0]);
      return module === null ? undefined : { module, path: ["*"] };
    }
    return undefined;
  }
  function requireBinding(name: ts.BindingName, value: Binding) {
    if (ts.isIdentifier(name)) {
      bind(name, value);
      return;
    }
    if (!ts.isObjectBindingPattern(name)) {
      limitation("unsupported-module-binding");
      return;
    }
    for (const element of name.elements) {
      if (
        element.dotDotDotToken ||
        element.initializer ||
        !ts.isIdentifier(element.name) ||
        (element.propertyName &&
          !ts.isIdentifier(element.propertyName) &&
          !ts.isStringLiteral(element.propertyName))
      ) {
        limitation("unsupported-module-binding");
        continue;
      }
      const member = element.propertyName
        ? element.propertyName.text
        : element.name.text;
      bind(element.name, {
        module: value.module,
        path: [publicSpecifier(member)],
      });
    }
  }
  function collect(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const module = literal(node.moduleSpecifier);
      const clause = node.importClause;
      if (module !== null && clause && !clause.isTypeOnly) {
        if (clause.name) bind(clause.name, { module, path: ["default"] });
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))
          bind(clause.namedBindings.name, { module, path: ["*"] });
        else if (clause.namedBindings)
          for (const specifier of clause.namedBindings.elements) {
            if (!specifier.isTypeOnly)
              bind(specifier.name, {
                module,
                path: [
                  publicSpecifier(
                    specifier.propertyName?.text ?? specifier.name.text,
                  ),
                ],
              });
          }
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const module = literal(node.moduleReference.expression);
      if (module !== null && !node.isTypeOnly)
        bind(node.name, { module, path: ["*"] });
    } else if (ts.isVariableDeclaration(node) && node.initializer) {
      const initial = unwrap(node.initializer);
      if (commonRequire(initial)) {
        const module = literal(initial.arguments[0]);
        if (module !== null) {
          if (
            ts.isVariableDeclarationList(node.parent) &&
            node.parent.flags & ts.NodeFlags.Const
          )
            requireBinding(node.name, { module, path: ["*"] });
          else limitation("mutable-module-binding-not-analyzed");
        }
      }
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node))
      reference(node, "import", node.moduleSpecifier);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier)
      reference(node, "export", node.moduleSpecifier);
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    )
      reference(node, "import-equals", node.moduleReference.expression);
    else if (ts.isImportTypeNode(node))
      reference(
        node,
        "import-type",
        ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined,
      );
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      reference(node, "dynamic-import", node.arguments[0]);
      limitation("dynamic-import-bindings-not-analyzed");
    } else if (commonRequire(node))
      reference(node, "require", node.arguments[0]);
    if (
      (ts.isCallExpression(node) &&
        node.expression.kind !== ts.SyntaxKind.ImportKeyword &&
        !commonRequire(node)) ||
      ts.isNewExpression(node)
    ) {
      const binding = access(node.expression);
      if (binding)
        apiUsages.push({
          module: binding.module,
          path: binding.path,
          kind: ts.isNewExpression(node) ? "construct" : "call",
          optional: ts.isCallExpression(node) && ts.isCallChain(node),
          location: location(node),
        });
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      !commonRequire(unwrap(node.initializer)) &&
      access(node.initializer)
    )
      limitation("module-alias-dataflow-not-analyzed");
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { references, apiUsages, limitations };
}

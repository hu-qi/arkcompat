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

function bindingMember(element: ts.BindingElement): string | undefined {
  if (
    element.dotDotDotToken ||
    element.initializer ||
    !ts.isIdentifier(element.name) ||
    (element.propertyName &&
      !ts.isIdentifier(element.propertyName) &&
      !ts.isStringLiteral(element.propertyName))
  )
    return undefined;
  return publicSpecifier(element.propertyName?.text ?? element.name.text);
}

function initializedConst(
  node: ts.Node | undefined,
): node is ts.VariableDeclaration & { initializer: ts.Expression } {
  return (
    node !== undefined &&
    ts.isVariableDeclaration(node) &&
    node.initializer !== undefined &&
    ts.isVariableDeclarationList(node.parent) &&
    (node.parent.flags & ts.NodeFlags.Const) !== 0
  );
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
  const analyzedImports = new Set<ts.CallExpression>();
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
  function awaitedImport(input: ts.Expression): ts.CallExpression | undefined {
    const value = unwrap(input);
    if (!ts.isAwaitExpression(value)) return undefined;
    const call = unwrap(value.expression);
    return ts.isCallExpression(call) &&
      call.expression.kind === ts.SyntaxKind.ImportKeyword
      ? call
      : undefined;
  }
  function bind(name: ts.Identifier, value: Binding) {
    const symbol = checker.getSymbolAtLocation(name);
    if (symbol) bindings.set(symbol, value);
  }
  function access(
    input: ts.Expression,
    aliases = new Set<ts.Symbol>(),
  ): Binding | undefined {
    const value = unwrap(input);
    if (ts.isIdentifier(value)) {
      const symbol = checker.getSymbolAtLocation(value);
      if (!symbol) return undefined;
      const binding = bindings.get(symbol);
      if (binding) return binding;
      let declaration: ts.Node | undefined = symbol.valueDeclaration;
      let member: string | undefined;
      if (declaration && ts.isBindingElement(declaration)) {
        member = bindingMember(declaration);
        if (
          member === undefined ||
          !ts.isObjectBindingPattern(declaration.parent)
        )
          return undefined;
        declaration = declaration.parent.parent;
      }
      if (!initializedConst(declaration)) return undefined;
      if (aliases.has(symbol)) {
        limitation("module-alias-cycle-not-analyzed");
        return undefined;
      }
      if (aliases.size >= 32) {
        limitation("module-alias-depth-limit");
        return undefined;
      }
      aliases.add(symbol);
      const base = access(declaration.initializer, aliases);
      if (!base || member === undefined) return base;
      return { module: base.module, path: [...base.path, member] };
    }
    if (ts.isPropertyAccessExpression(value)) {
      const base = access(value.expression, aliases);
      return base
        ? { module: base.module, path: [...base.path, value.name.text] }
        : undefined;
    }
    if (ts.isElementAccessExpression(value)) {
      const base = access(value.expression, aliases);
      if (!base) return undefined;
      const member = value.argumentExpression;
      if (ts.isStringLiteralLike(member))
        return {
          module: base.module,
          path: [...base.path, publicSpecifier(member.text)],
        };
      limitation("computed-module-member-not-analyzed");
      return undefined;
    }
    const loader = commonRequire(value) ? value : awaitedImport(value);
    if (loader) {
      const module = literal(loader.arguments[0]);
      if (module === null) return undefined;
      if (loader.expression.kind === ts.SyntaxKind.ImportKeyword)
        analyzedImports.add(loader);
      return { module, path: ["*"] };
    }
    return undefined;
  }
  function moduleBinding(name: ts.BindingName, value: Binding) {
    if (ts.isIdentifier(name)) {
      bind(name, value);
      return;
    }
    if (!ts.isObjectBindingPattern(name)) {
      limitation("unsupported-module-binding");
      return;
    }
    for (const element of name.elements) {
      const member = bindingMember(element);
      if (member === undefined) {
        limitation("unsupported-module-binding");
        continue;
      }
      // bindingMember only accepts identifier binding names.
      bind(element.name as ts.Identifier, {
        module: value.module,
        path: [member],
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
      const loader = commonRequire(initial) ? initial : awaitedImport(initial);
      if (loader) {
        const module = literal(loader.arguments[0]);
        if (module !== null) {
          if (
            ts.isVariableDeclarationList(node.parent) &&
            node.parent.flags & ts.NodeFlags.Const
          ) {
            moduleBinding(node.name, { module, path: ["*"] });
            if (loader.expression.kind === ts.SyntaxKind.ImportKeyword)
              analyzedImports.add(loader);
          } else limitation("mutable-module-binding-not-analyzed");
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
      if (!analyzedImports.has(node))
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
      !awaitedImport(node.initializer) &&
      access(node.initializer)
    ) {
      const traced = ts.isIdentifier(node.name)
        ? access(node.name) !== undefined
        : initializedConst(node) &&
          ts.isObjectBindingPattern(node.name) &&
          node.name.elements.every(
            (element) => bindingMember(element) !== undefined,
          );
      if (!traced) limitation("module-alias-dataflow-not-analyzed");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { references, apiUsages, limitations };
}

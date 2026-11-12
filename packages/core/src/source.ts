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
interface AnalyzeSourceOptions {
  ets?: boolean;
}
const trackedHostGlobals = new Set([
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "XMLHttpRequest",
  "fetch",
  "WebSocket",
  "history",
  "location",
  "process",
  "Buffer",
  "global",
  "globalThis",
]);
/**
 * Authored ETS uses `struct` as a declaration keyword. Replace only a line-leading
 * declaration token with a same-length class form so source offsets remain stable.
 * ArkUI DSL blocks can still produce syntax diagnostics and are handled below.
 */
function prepareEtsSource(text: string): string {
  return text.replace(
    /(^|\r?\n)([ \t]*)struct(?=[ \t]+[A-Za-z_])/g,
    (_match, lineBreak: string, indent: string) =>
      `${lineBreak}${indent}class `,
  );
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
  options: AnalyzeSourceOptions = {},
): {
  references: ModuleReference[];
  apiUsages: ApiUsage[];
  limitations: Limitation[];
} {
  const ets = options.ets === true;
  const source = ts.createSourceFile(
    path,
    ets ? prepareEtsSource(text) : text,
    ts.ScriptTarget.Latest,
    true,
  );
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
  if (errors.length && !ets) {
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
  const etsImports = new Map<string, Binding>();
  const ambiguousEtsImports = new Set<string>();
  const analyzedImports = new Set<ts.CallExpression>();
  function limitation(code: string) {
    if (!codes.has(code)) {
      codes.add(code);
      limitations.push({ code, path });
    }
  }
  if (ets) limitation("ets-arkui-dsl-not-analyzed");
  if (errors.length) limitation("ets-source-syntax-partially-analyzed");
  function symbolAtLocation(node: ts.Node): ts.Symbol | undefined {
    try {
      return checker.getSymbolAtLocation(node);
    } catch {
      limitation("ets-type-check-partially-analyzed");
      return undefined;
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
    return !symbolAtLocation(node.expression)?.declarations?.length;
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
    const symbol = symbolAtLocation(name);
    if (symbol) bindings.set(symbol, value);
  }
  function bindEtsImport(name: ts.Identifier, value: Binding) {
    if (!ets) return;
    if (etsImports.has(name.text) || ambiguousEtsImports.has(name.text)) {
      etsImports.delete(name.text);
      ambiguousEtsImports.add(name.text);
      limitation("ets-import-binding-ambiguous");
      return;
    }
    etsImports.set(name.text, value);
  }
  function bindingNames(name: ts.BindingName, result: Set<string>): void {
    if (ts.isIdentifier(name)) {
      result.add(name.text);
      return;
    }
    for (const element of name.elements)
      if (!ts.isOmittedExpression(element)) bindingNames(element.name, result);
  }
  function declarationNames(
    declaration: ts.VariableDeclaration,
    result: Set<string>,
  ): void {
    bindingNames(declaration.name, result);
  }
  const statementNames = new WeakMap<ts.Node, Set<string>>();
  function namesInStatements(
    container: ts.Node,
    statements: readonly ts.Statement[],
  ): Set<string> {
    const cached = statementNames.get(container);
    if (cached) return cached;
    const names = new Set<string>();
    for (const statement of statements) {
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          declarationNames(declaration, names);
      else if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isEnumDeclaration(statement) ||
          ts.isModuleDeclaration(statement)) &&
        statement.name
      )
        names.add(statement.name.text);
    }
    statementNames.set(container, names);
    return names;
  }
  function variableListNames(
    list: ts.VariableDeclarationList | undefined,
    result: Set<string>,
  ): void {
    for (const declaration of list?.declarations ?? [])
      declarationNames(declaration, result);
  }
  const functionScopeNames = new WeakMap<ts.Node, Set<string>>();
  function isFunctionScopeNode(node: ts.Node): node is ts.SignatureDeclaration {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    );
  }
  function namesInFunctionScope(node: ts.SignatureDeclaration): Set<string> {
    const cached = functionScopeNames.get(node);
    if (cached) return cached;
    const names = new Set<string>();
    for (const parameter of node.parameters)
      bindingNames(parameter.name, names);
    if (
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
      node.name
    )
      names.add(node.name.text);
    function collectVarNames(current: ts.Node) {
      if (current !== node && isFunctionScopeNode(current)) return;
      if (current !== node && ts.isClassLike(current)) return;
      if (
        ts.isVariableDeclarationList(current) &&
        (current.flags & ts.NodeFlags.BlockScoped) === 0
      )
        variableListNames(current, names);
      ts.forEachChild(current, collectVarNames);
    }
    collectVarNames(node);
    functionScopeNames.set(node, names);
    return names;
  }
  function loopNames(
    node: ts.ForStatement | ts.ForInStatement | ts.ForOfStatement,
  ): Set<string> {
    const names = new Set<string>();
    if (
      node.initializer !== undefined &&
      ts.isVariableDeclarationList(node.initializer)
    )
      variableListNames(node.initializer, names);
    return names;
  }
  function isEtsImportShadowed(
    identifier: ts.Identifier,
    name: string,
  ): boolean {
    for (
      let current: ts.Node | undefined = identifier.parent;
      current;
      current = current.parent
    ) {
      if (ts.isSourceFile(current)) {
        if (namesInStatements(current, current.statements).has(name))
          return true;
      } else if (
        ts.isBlock(current) ||
        ts.isModuleBlock(current) ||
        ts.isCaseBlock(current)
      ) {
        const statements = ts.isCaseBlock(current)
          ? current.clauses.flatMap((clause) => [...clause.statements])
          : current.statements;
        if (namesInStatements(current, statements).has(name)) return true;
      }
      if (
        isFunctionScopeNode(current) &&
        namesInFunctionScope(current).has(name)
      )
        return true;
      if (
        (ts.isForStatement(current) ||
          ts.isForInStatement(current) ||
          ts.isForOfStatement(current)) &&
        loopNames(current).has(name)
      )
        return true;
      if (
        ts.isCatchClause(current) &&
        current.variableDeclaration &&
        (() => {
          const names = new Set<string>();
          declarationNames(current.variableDeclaration, names);
          return names.has(name);
        })()
      )
        return true;
      if (
        (ts.isClassDeclaration(current) || ts.isClassExpression(current)) &&
        current.name?.text === name
      )
        return true;
    }
    return false;
  }
  function etsImportAccess(identifier: ts.Identifier): Binding | undefined {
    const imported = etsImports.get(identifier.text);
    if (
      !ets ||
      !imported ||
      ambiguousEtsImports.has(identifier.text) ||
      isEtsImportShadowed(identifier, identifier.text)
    )
      return undefined;
    return imported;
  }
  function access(
    input: ts.Expression,
    aliases = new Set<ts.Symbol>(),
  ): Binding | undefined {
    const value = unwrap(input);
    if (ts.isIdentifier(value)) {
      const symbol = symbolAtLocation(value);
      if (!symbol || (!bindings.has(symbol) && !symbol.declarations?.length)) {
        const etsImported = etsImportAccess(value);
        if (etsImported) return etsImported;
        if (
          trackedHostGlobals.has(value.text) &&
          !isEtsImportShadowed(value, value.text)
        ) {
          return {
            module: "globalThis",
            path:
              value.text === "globalThis" || value.text === "global"
                ? []
                : [value.text],
          };
        }
        return undefined;
      }
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
    if (
      value.kind === ts.SyntaxKind.ThisKeyword ||
      value.kind === ts.SyntaxKind.SuperKeyword
    ) {
      return undefined;
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
        if (clause.name) {
          const binding = { module, path: ["default"] };
          bind(clause.name, binding);
          bindEtsImport(clause.name, binding);
        }
        if (
          clause.namedBindings &&
          ts.isNamespaceImport(clause.namedBindings)
        ) {
          const binding = { module, path: ["*"] };
          bind(clause.namedBindings.name, binding);
          bindEtsImport(clause.namedBindings.name, binding);
        } else if (clause.namedBindings)
          for (const specifier of clause.namedBindings.elements) {
            if (!specifier.isTypeOnly) {
              const binding = {
                module,
                path: [
                  publicSpecifier(
                    specifier.propertyName?.text ?? specifier.name.text,
                  ),
                ],
              };
              bind(specifier.name, binding);
              bindEtsImport(specifier.name, binding);
            }
          }
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const module = literal(node.moduleReference.expression);
      if (module !== null && !node.isTypeOnly) {
        const binding = { module, path: ["*"] };
        bind(node.name, binding);
        bindEtsImport(node.name, binding);
      }
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
      if (binding && binding.path.length > 0)
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

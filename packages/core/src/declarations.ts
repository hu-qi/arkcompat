import type {
  DeclaredDependency,
  DependencySection,
} from "@arkcompat/contracts";
const sections: DependencySection[] = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function publicSpecifier(value: string): string {
  // URL declarations may contain registry credentials or signed query parameters.
  if (/:\/\//.test(value) || /^(git@|github:|gitlab:|bitbucket:)/.test(value))
    return "[redacted-url]";
  if (/^(file:|link:|\/|[A-Za-z]:\\)/.test(value)) return "[local-reference]";
  return value;
}
export function dependencies(
  manifest: unknown,
  context = "package.json",
): DeclaredDependency[] {
  if (!record(manifest)) throw new Error(`${context} must contain an object`);
  return sections.flatMap((section) => {
    const entries = manifest[section];
    if (entries === undefined) return [];
    if (!record(entries))
      throw new Error(`${context} ${section} must be an object`);
    return Object.keys(entries)
      .sort()
      .map((name) => {
        const specifier = entries[name];
        if (typeof specifier !== "string" || !specifier.trim())
          throw new Error(
            `${context} ${section} contains an invalid dependency specifier`,
          );
        return {
          name,
          specifier,
          section,
          status: "unknown",
        };
      });
  });
}

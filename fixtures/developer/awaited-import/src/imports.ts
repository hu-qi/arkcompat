// Authored static analysis input. Never install or execute this fixture.
export async function load(moduleName: string) {
  const fs = await import("node:fs/promises");
  fs.readFile("omitted-path");
  const { default: Client } = await import("example-client");
  new Client();
  const unresolved = import(moduleName);
  unresolved.then(() => {});
}

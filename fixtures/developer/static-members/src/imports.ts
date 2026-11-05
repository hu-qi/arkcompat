// Authored static analysis input. Never install or execute this fixture.
import * as fs from "node:fs";
import client from "example-client";

fs["promises"][`readFile`]("omitted-path");
client?.["send"]?.("omitted-payload");

export function dynamic(key: string) {
  fs[key]("omitted-path");
}

export function shadowed(fs: { readFile(): void }) {
  fs["readFile"]();
}

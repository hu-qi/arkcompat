// Authored static analysis input. Never install or execute this fixture.
import { readFile as original } from "node:fs";

const read = original;
const copy = read;
copy("omitted-path");

export function shadowed(read: () => void) {
  const copy = read;
  copy();
}

let mutable = original;
mutable = () => {};
mutable();

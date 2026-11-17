import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Read the first candidate schema that exists.
 *
 * Only ENOENT means "try the next location". Permission, directory and I/O
 * errors are configuration or corruption failures and must surface with the
 * offending path instead of silently selecting a different schema.
 */
export function readFirstAvailableSchema(candidates: readonly URL[]): string {
  const missing: string[] = [];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        const path = fileURLToPath(candidate);
        throw new Error(
          `Knowledge schema could not be read at ${path} (${code ?? "unknown"}): ${(error as Error).message}`,
          { cause: error },
        );
      }
      missing.push(fileURLToPath(candidate));
    }
  }
  throw new Error(
    `Knowledge schema is unavailable; checked: ${missing.join(", ")}`,
  );
}

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@arkcompat/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@arkcompat/contracts": fileURLToPath(
        new URL("./packages/contracts/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      provider: "istanbul",
      reportOnFailure: true,
      include: ["packages/core/src/**/*.ts", "packages/knowledge/src/**/*.ts"],
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        perFile: true,
        statements: 85,
        branches: 85,
        functions: 80,
        lines: 89,
      },
    },
  },
});

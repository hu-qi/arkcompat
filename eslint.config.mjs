import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "coverage/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["fixtures/developer/source-api/src/loader.cjs"],
    // This regression input intentionally demonstrates a CommonJS builtin import.
    rules: {
      "@typescript-eslint/no-require-imports": [
        "error",
        { allow: ["^node:path$"] },
      ],
    },
  },
);

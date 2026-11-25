// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// The phone rules shared by the apps (through mobile-core) and the admin web:
// the recommended JavaScript and TypeScript rules are the whole config.
export default tseslint.config(
  { ignores: ["node_modules", "jest.config.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { console: "readonly", URL: "readonly" } },
  },
  {
    // Coding standards «File size and reuse»: 400 lines of code per file.
    files: ["src/**/*.ts"],
    ignores: ["src/generated/**"],
    rules: { "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }] },
  },
);

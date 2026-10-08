// @ts-check
import js from "@eslint/js";
import globals from "globals";

// The package holds plain Node ES modules: the shared ESLint configs and the
// scripts the applications run through its bins. Nothing here is TypeScript
// or React, so the recommended JavaScript rules with Node's globals are the
// whole config.
export default [
  { ignores: ["node_modules"] },
  {
    files: ["**/*.{js,mjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
];

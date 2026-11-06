// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Pure TypeScript calculations for the studio's finances, shared by the admin
// web: the recommended JavaScript and TypeScript rules are the whole config.
export default tseslint.config(
  { ignores: ["node_modules", "jest.config.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

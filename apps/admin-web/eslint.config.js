import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    // shadcn primitives re-export Radix parts next to their styled components.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // The Playwright suite, its config, and the Vercel middleware run in Node.
    files: ["e2e/**/*.ts", "playwright.config.ts", "middleware.ts"],
    languageOptions: { globals: globals.node },
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: [
      "src/**/*.spec.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "e2e/support/*.test.ts",
      "jest.setup.ts",
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.jest, ...globals.node },
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);

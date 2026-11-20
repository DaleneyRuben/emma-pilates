import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noRawTypography from "./eslint-rules/no-raw-typography.js";

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
      // Coding standards «File size and reuse»: 400 lines of code per file.
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Follow-up 285: typography comes from the tipo-* classes of index.css.
    // The typography module describes the scale and is the one exemption.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/**/*.spec.{ts,tsx}",
      "src/test/**",
      "src/components/ui/typography.ts",
    ],
    plugins: {
      typography: { rules: { "no-raw-typography": noRawTypography } },
    },
    rules: { "typography/no-raw-typography": "error" },
  },
  {
    // shadcn primitives re-export Radix parts next to their styled components.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // The Playwright suite, its config, and the Vercel middleware and
    // functions run in Node.
    files: [
      "e2e/**/*.ts",
      "playwright.config.ts",
      "middleware.ts",
      "api/**/*.ts",
    ],
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

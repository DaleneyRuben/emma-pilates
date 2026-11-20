// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Workspace packages are consumed by their public exports only (ADR-0013,
// coding standards «Monorepo and module boundaries»); applications never import
// one another, and packages never import applications.
const restrictedImportPatterns = [
  {
    group: [
      "@pilates/api-contracts/*",
      "@pilates/mobile-core/*",
      // Test-only entry for Jest setup files.
      "!@pilates/mobile-core/testing",
    ],
    message:
      "Import a workspace package by its name and public exports, never a deep path.",
  },
  {
    group: [
      "@pilates/backend",
      "@pilates/backend/*",
      "@pilates/admin-web",
      "@pilates/admin-web/*",
      "@pilates/client-mobile",
      "@pilates/client-mobile/*",
      "@pilates/staff-mobile",
      "@pilates/staff-mobile/*",
    ],
    message:
      "Applications never import one another, and packages never import applications.",
  },
  {
    group: ["**/apps/**", "**/packages/**"],
    message:
      "A relative path must not leave the package; import the workspace package by name.",
  },
];

// Follow-up 285: every text in both apps is a `Text` variant from mobile-core,
// which owns the face, size, line height, spacing and the two tones. Only the
// scale's own files may name a font or a text colour.
const restrictedTypographyImports = [
  {
    name: "react-native",
    importNames: ["Text"],
    message: "Use <Text variant=…> from @pilates/mobile-core (follow-up 285).",
  },
  {
    name: "@pilates/mobile-core",
    importNames: ["typography", "fontFamilies"],
    message:
      "Sizes and faces live inside <Text variant=…> (follow-up 285); pick a variant.",
  },
];

const typographyKeys = [
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textDecorationLine",
  "textTransform",
];

const restrictedTypographySyntax = [
  {
    selector: `ObjectExpression > Property[key.name=/^(${typographyKeys.join("|")})$/]`,
    message:
      "Text styles come from <Text variant=…> in @pilates/mobile-core (follow-up 285); never declare one locally.",
  },
  {
    selector: "ObjectExpression > Property[key.name='color']",
    message:
      "A text's colour is the tone prop of <Text> (ink or onDark); an icon takes its colour as a prop.",
  },
];

const typeScaleFiles = [
  "src/ui/type-scale.ts",
  "src/ui/text.tsx",
  "src/ui/field-text.ts",
  "src/ui/type-scale-audit.ts",
  "src/ui/fonts.ts",
  "src/ui/tokens.ts",
];

// React Native code runs in Hermes with the browser-like globals Expo
// polyfills (fetch, URL, timers) plus Node-style process.env and __DEV__.
const reactNativeGlobals = {
  ...globals.browser,
  ...globals.node,
  __DEV__: "readonly",
};

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      ".expo",
      "dist",
      "coverage",
      ".maestro",
      "assets",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: reactNativeGlobals,
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Airbnb's setting: props dropped before a ...rest spread are not unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { vars: "all", args: "after-used", ignoreRestSiblings: true },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: restrictedTypographyImports,
          patterns: restrictedImportPatterns,
        },
      ],
      "no-restricted-syntax": ["error", ...restrictedTypographySyntax],
      // Coding standards «File size and reuse»: 400 lines of code per file.
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // The scale itself, and specs that build off-scale samples or assert a
    // rendered style.
    files: [...typeScaleFiles, "**/*.spec.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: restrictedImportPatterns },
      ],
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["**/*.spec.{ts,tsx}", "jest.setup.ts"],
    languageOptions: {
      globals: { ...reactNativeGlobals, ...globals.jest },
    },
    rules: {
      // jest.mock factories are hoisted above the imports, so require() is
      // the only way to load a module inside one.
      "@typescript-eslint/no-require-imports": "off",
      // Test probes write what a component saw into a module variable.
      "react-hooks/globals": "off",
    },
  },
);

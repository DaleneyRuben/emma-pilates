// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/generated/prisma/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      // Coding standards «File size and reuse»: 400 lines of code per file.
      'max-lines': [
        'error',
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Written before the rule (coding standards «File size and reuse»); do
    // not grow them, move the part you edit out instead (DOC-004).
    files: [
      'src/booking/booking.module.ts',
      'src/booking/administration/administration.controller.ts',
      'src/booking/commands/prisma-booking-commands.ts',
      'src/booking/evaluations/prisma-evaluation-commands.ts',
      'src/booking/payments/prisma-payment-commands.ts',
      'src/development-fixtures/development-fixtures.ts',
      'src/worker.spec.ts',
      'test/evaluations.e2e-spec.ts',
      'test/database/booking-command.integration-spec.ts',
      'test/database/client-registration.integration-spec.ts',
      'test/database/evaluation-bookings.integration-spec.ts',
      'test/database/payment-lifecycle.integration-spec.ts',
      'test/database/promotions.integration-spec.ts',
    ],
    rules: { 'max-lines': 'off' },
  },
);

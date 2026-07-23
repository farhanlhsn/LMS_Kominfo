import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";

/** Flat ESLint — security-focused starter; expand rules as debt is paid. */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/prisma/migrations/**",
      "apps/api/Python/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      "**/next-env.d.ts",
      "**/e2e/**",
      "apps/api/src/modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      security,
      "no-secrets": noSecrets,
    },
    rules: {
      // Keep CI green on large legacy surface; tighten over time.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["warn", "smart"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      // SAST-oriented rules (warn first to avoid flooding legacy surface).
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-child-process": "warn",
      "security/detect-object-injection": "off",
      "security/detect-possible-timing-attacks": "warn",
      "no-secrets/no-secrets": [
        "error",
        {
          ignoreContent: [
            "ChangeMe123!",
            "dev-access-secret",
            "dev-refresh-secret",
            "dev-enterprise-secret",
            "Password123!",
          ],
        },
      ],
    },
  },
  {
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
);

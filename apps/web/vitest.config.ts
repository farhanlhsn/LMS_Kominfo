import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    forbidOnly: Boolean(process.env.CI),
    slowTestThreshold: 1000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.d.ts",
        // C0: thin App Router shells covered by E2E, not unit coverage
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/template.tsx",
        "src/app/**/default.tsx",
      ],
      thresholds: {
        lines: 10,
        functions: 20,
        branches: 20,
        statements: 10,
      },
    },
  },
});

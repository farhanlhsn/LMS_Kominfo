import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    forbidOnly: Boolean(process.env.CI),
    slowTestThreshold: 1000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.d.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
        statements: 100,
      },
    },
  },
});

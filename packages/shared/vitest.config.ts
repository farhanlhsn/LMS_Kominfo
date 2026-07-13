import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    forbidOnly: Boolean(process.env.CI),
    slowTestThreshold: 1000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.d.ts"],
      thresholds: {
        lines: 25,
        functions: 40,
        branches: 40,
        statements: 25,
      },
    },
  },
});

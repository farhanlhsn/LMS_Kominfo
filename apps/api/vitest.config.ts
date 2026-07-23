import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [
    // esbuild can't emit `design:paramtypes`, which NestJS needs for
    // class-token DI. SWC (reads tsconfig.json: emitDecoratorMetadata) emits
    // decorator metadata so the full AppModule boots under Vitest.
    swc.vite(),
  ],
  test: {
    environment: "node",
    globals: true,
    forbidOnly: Boolean(process.env.CI),
    testTimeout: 15000,
    // Log tests slower than 1s (9.4).
    slowTestThreshold: 1000,
    include: ["src/**/*.spec.ts"],
    exclude: [
      "src/**/*.integration.spec.ts",
      "src/modules/**",
      "node_modules/**",
    ],
    // Soft floor — raise as suites expand; fails CI if coverage collapses.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.integration.spec.ts",
        "src/modules/**",
        "src/main.ts",
        "src/**/dto/**",
        "src/**/*.dto.ts",
        "src/test/**",
        "src/**/*.d.ts",
        "src/rbac/types/**",
        "src/auth/types/**",
        "src/**/*.interface.ts",
        "src/**/*.types.ts",
        // bootstrap / Nest module shells — no business logic
        "src/**/*.module.ts",
        "src/common/openapi/openapi-document.ts",
      ],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 55,
        statements: 98,
      },
    },
  },
});

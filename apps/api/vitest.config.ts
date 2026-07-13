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
    // Log tests slower than 1s (9.4).
    slowTestThreshold: 1000,
    include: ["src/**/*.spec.ts"],
    exclude: ["src/**/*.integration.spec.ts", "node_modules/**"],
    // Soft floor — raise as suites expand; fails CI if coverage collapses.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.spec.ts",
        "src/**/*.integration.spec.ts",
        "src/main.ts",
        "src/**/dto/**",
      ],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 50,
        statements: 55,
      },
    },
  },
});

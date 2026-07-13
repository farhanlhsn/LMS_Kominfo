import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

function loadRootEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const apiPort = Number(process.env.API_PORT ?? 4000);
const webPort = Number(process.env.WEB_PORT ?? 3000);
const apiBaseURL =
  process.env.E2E_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  `http://localhost:${apiPort}/api/v1`;
const webBaseURL = process.env.E2E_WEB_URL ?? `http://localhost:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // list prints per-test duration; html for post-run drill-down (9.4).
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: webBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @lms/api dev",
      url: `${apiBaseURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiBaseURL,
        DISABLE_RATE_LIMIT: "true",
      },
    },
    {
      command: "pnpm --filter @lms/web dev",
      url: webBaseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: apiBaseURL,
      },
    },
  ],
  projects: [
    {
      name: "api",
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        baseURL: apiBaseURL,
      },
    },
    {
      name: "chromium",
      testMatch: /ui\/.*\.spec\.ts/,
      testIgnore: /ui\/mobile-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: webBaseURL,
      },
    },
    {
      name: "mobile-chrome",
      testMatch: /ui\/mobile-.*\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        baseURL: webBaseURL,
      },
    },
  ],
});

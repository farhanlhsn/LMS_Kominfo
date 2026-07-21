import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment variables from the first .env found, searching the db
// package first and then the monorepo root. This makes every Prisma CLI
// invocation (generate, migrate, deploy, studio) pick up DATABASE_URL and the
// seed variables automatically, so no manual `$env:DATABASE_URL=...` is needed.
const envCandidates = [
  resolve(__dirname, ".env"),
  resolve(__dirname, "..", "..", ".env"),
];
const envPath = envCandidates.find((candidate) => existsSync(candidate));
if (envPath) {
  loadEnv({ path: envPath });
}

export default defineConfig({
  schema: resolve(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: resolve(__dirname, "prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});

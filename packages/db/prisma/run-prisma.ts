import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { config } from "dotenv";
import { existsSync } from "node:fs";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", "..", ".env"),
  resolve(__dirname, "..", "..", ".env"),
];
const envPath = envCandidates.find((path) => existsSync(path));
if (envPath) {
  config({ path: envPath });
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("No Prisma command provided. Example: prisma generate");
  process.exit(1);
}

const result = spawn(
  "pnpm",
  ["prisma", ...args],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  },
);

result.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

result.on("close", (code) => {
  process.exit(code ?? 1);
});

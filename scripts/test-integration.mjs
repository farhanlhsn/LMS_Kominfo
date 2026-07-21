import { spawnSync } from "node:child_process";

const COMPOSE = "docker-compose.test.yml";
const DATABASE_URL =
  process.env.INTEGRATION_DATABASE_URL ??
  "postgresql://lms:lms_test@localhost:5434/lms_test?schema=public";
const REDIS_URL =
  process.env.INTEGRATION_REDIS_URL ?? "redis://localhost:6380";

function run(cmd, args, env = {}) {
  const r = spawnSync([cmd, ...args].join(" "), [], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with ${r.status}`);
  }
}

function assertDocker() {
  const r = spawnSync("docker", ["info"], { stdio: "pipe", shell: true });
  if (r.status !== 0) {
    throw new Error(
      "Docker daemon is not available. Start Docker Desktop (or the docker service), then re-run: pnpm test:integration",
    );
  }
}

function teardown() {
  console.log("\nTearing down test stack...");
  spawnSync("docker", ["compose", "-f", COMPOSE, "down", "-v"], {
    stdio: "inherit",
    shell: true,
  });
}

process.on("SIGINT", () => {
  teardown();
  process.exit(1);
});
process.on("SIGTERM", () => {
  teardown();
  process.exit(1);
});

try {
  assertDocker();

  console.log("Starting test stack (postgres + redis)...");
  run("docker", ["compose", "-f", COMPOSE, "up", "-d", "--wait"]);

  console.log("Applying migrations to lms_test...");
  run("pnpm", ["--filter", "@lms/db", "prisma:deploy"], {
    DATABASE_URL,
    NODE_ENV: "test",
  });

  console.log("Running API integration tests...");
  run("pnpm", ["--filter", "@lms/api", "test:integration"], {
    DATABASE_URL,
    REDIS_URL,
    NODE_ENV: "test",
    JWT_ACCESS_SECRET:
      process.env.JWT_ACCESS_SECRET ?? "integration-access-secret",
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ?? "integration-refresh-secret",
  });
} catch (err) {
  console.error("\nIntegration run failed:", err?.message ?? err);
  if (String(err?.message ?? err).includes("Docker daemon")) {
    console.error(
      "Hint: docker compose -f docker-compose.test.yml up -d --wait",
    );
  }
  process.exitCode = 1;
} finally {
  teardown();
}

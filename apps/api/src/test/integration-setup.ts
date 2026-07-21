export async function setup() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var is required for integration tests");
  }

  process.env.NODE_ENV = "test";
  process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
  process.env.S3_BUCKET = process.env.S3_BUCKET ?? "lms-local";
}

export async function teardown() {
  // env-based setup — nothing to tear down at the global level
}

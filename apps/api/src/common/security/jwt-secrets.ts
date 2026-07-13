const DEV_ACCESS = "dev-access-secret";
const DEV_REFRESH = "dev-refresh-secret";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function jwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (isProduction()) {
    throw new Error("JWT_ACCESS_SECRET is required in production");
  }
  return DEV_ACCESS;
}

export function jwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (secret) return secret;
  if (isProduction()) {
    throw new Error("JWT_REFRESH_SECRET is required in production");
  }
  return DEV_REFRESH;
}

/** Call once at boot so misconfigured prod fails before serving traffic. */
export function assertJwtSecretsConfigured(): void {
  if (!isProduction()) return;
  jwtAccessSecret();
  jwtRefreshSecret();
}

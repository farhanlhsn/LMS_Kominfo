export const API_VERSION_PREFIX = "api/v1";
export const DEFAULT_TIMEZONE = "UTC";

export const DEFAULT_PORTS = {
  api: 4000,
  web: 3000
} as const;

export function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

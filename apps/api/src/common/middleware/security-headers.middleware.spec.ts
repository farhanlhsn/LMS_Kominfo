import { describe, expect, it } from "vitest";
import { SecurityHeadersMiddleware } from "./security-headers.middleware";
import { CacheHeadersMiddleware } from "./cache-headers.middleware";

function createResponse() {
  const headers: Record<string, string> = {};
  return {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    getHeader: (name: string) => headers[name],
    headers,
  } as any;
}

describe("SecurityHeadersMiddleware", () => {
  const previousEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousEnv;
  });

  it("sets baseline security headers", () => {
    process.env.NODE_ENV = "test";
    const middleware = new SecurityHeadersMiddleware();
    const response = createResponse();
    middleware.use({} as any, response, () => undefined);
    expect(response.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(response.headers["X-Frame-Options"]).toBe("DENY");
    expect(response.headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers["Permissions-Policy"]).toContain("camera=()");
    expect(response.headers["Content-Security-Policy"]).toContain("default-src 'none'");
    expect(response.headers["Content-Security-Policy"]).toContain("script-src 'none'");
    expect(response.headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("adds HSTS only in production", () => {
    process.env.NODE_ENV = "production";
    const middleware = new SecurityHeadersMiddleware();
    const response = createResponse();
    middleware.use({} as any, response, () => undefined);
    expect(response.headers["Strict-Transport-Security"]).toContain("max-age");
  });
});

describe("CacheHeadersMiddleware", () => {
  it("sets no-store headers for api/v1 paths", () => {
    const middleware = new CacheHeadersMiddleware();
    const response = createResponse();
    middleware.use({ path: "/api/v1/courses" } as any, response, () => undefined);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(response.headers["Pragma"]).toBe("no-cache");
  });

  it("overrides cache for health endpoint", () => {
    const middleware = new CacheHeadersMiddleware();
    const response = createResponse();
    middleware.use({ path: "/api/v1/health" } as any, response, () => undefined);
    expect(response.headers["Cache-Control"]).toBe("public, max-age=30");
  });

  it("leaves response untouched for non-api paths", () => {
    const middleware = new CacheHeadersMiddleware();
    const response = createResponse();
    middleware.use({ path: "/static/logo.png" } as any, response, () => undefined);
    expect(response.headers["Cache-Control"]).toBeUndefined();
  });
});

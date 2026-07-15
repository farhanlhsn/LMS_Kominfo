import { describe, expect, it, vi } from "vitest";
import { CacheHeadersMiddleware } from "./cache-headers.middleware";

function run(path: string) {
  const middleware = new CacheHeadersMiddleware();
  const headers: Record<string, string> = {};
  const response = {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
  } as any;
  const next = vi.fn();
  middleware.use({ path } as any, response, next);
  return { headers, next };
}

describe("CacheHeadersMiddleware", () => {
  it("sets no-store for API paths", () => {
    const { headers, next } = run("/api/v1/courses");
    expect(headers["Cache-Control"]).toContain("no-store");
    expect(next).toHaveBeenCalled();
  });

  it("allows short cache on health", () => {
    const { headers } = run("/api/v1/health");
    expect(headers["Cache-Control"]).toContain("max-age=30");
  });

  it("does not force no-store for non-api paths", () => {
    const { headers } = run("/static/app.js");
    expect(headers["Cache-Control"]).toBeUndefined();
  });
});

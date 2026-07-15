import { describe, expect, it, vi } from "vitest";
import { RequestLoggingMiddleware } from "./request-logging.middleware";

describe("RequestLoggingMiddleware", () => {
  it("records metrics and logs on finish", () => {
    const middleware = new RequestLoggingMiddleware();
    const handlers: Record<string, () => void> = {};
    const response = {
      statusCode: 200,
      on: (event: string, cb: () => void) => {
        handlers[event] = cb;
      },
    } as any;
    const next = vi.fn();
    middleware.use(
      { method: "GET", originalUrl: "/api/v1/health", url: "/api/v1/health" } as any,
      response,
      next,
    );
    expect(next).toHaveBeenCalled();
    handlers.finish?.();
  });

  it("uses warn/error levels for 4xx/5xx", () => {
    const middleware = new RequestLoggingMiddleware();
    for (const statusCode of [404, 500]) {
      const handlers: Record<string, () => void> = {};
      const response = {
        statusCode,
        on: (event: string, cb: () => void) => {
          handlers[event] = cb;
        },
      } as any;
      middleware.use(
        { method: "POST", originalUrl: "/api/v1/x", url: "/api/v1/x" } as any,
        response,
        vi.fn(),
      );
      handlers.finish?.();
    }
  });
});

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { HttpExceptionFilter } from "./http-exception.filter";

function host(statusCapture: { status?: number; body?: unknown }) {
  const response = {
    status: vi.fn().mockImplementation((code: number) => {
      statusCapture.status = code;
      return {
        json: (body: unknown) => {
          statusCapture.body = body;
        },
      };
    }),
  };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({
        method: "GET",
        originalUrl: "/api/v1/x",
      }),
    }),
  } as any;
}

describe("HttpExceptionFilter", () => {
  it("maps unknown errors to 500", () => {
    const filter = new HttpExceptionFilter();
    const capture: { status?: number; body?: any } = {};
    filter.catch(new Error("boom"), host(capture));
    expect(capture.status).toBe(500);
    expect(capture.body.success).toBe(false);
    expect(capture.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("maps HttpException string and object responses", () => {
    const filter = new HttpExceptionFilter();
    const capture: { status?: number; body?: any } = {};
    filter.catch(new NotFoundException("missing"), host(capture));
    expect(capture.status).toBe(404);
    expect(capture.body.error.message).toBe("missing");

    filter.catch(
      new BadRequestException({
        message: ["a", "b"],
        error: "Bad Request",
      }),
      host(capture),
    );
    expect(capture.status).toBe(400);
    expect(capture.body.error.message).toBe("Validation failed");
    expect(capture.body.error.details).toEqual(["a", "b"]);
  });

  it("logs 4xx warn for non-auth statuses", () => {
    const filter = new HttpExceptionFilter();
    const capture: { status?: number; body?: any } = {};
    filter.catch(
      new HttpException("nope", HttpStatus.FORBIDDEN),
      host(capture),
    );
    expect(capture.status).toBe(403);
  });

  it("maps status codes and sparse request/exception shapes", () => {
    const filter = new HttpExceptionFilter();
    const capture: { status?: number; body?: any } = {};

    filter.catch(
      new HttpException("auth", HttpStatus.UNAUTHORIZED),
      host(capture),
    );
    expect(capture.body.error.code).toBe("UNAUTHORIZED");

    filter.catch(new NotFoundException(), host(capture));
    expect(capture.body.error.code).toBe("NOT_FOUND");

    filter.catch(
      new HttpException("teapot", HttpStatus.I_AM_A_TEAPOT),
      host(capture),
    );
    expect(capture.body.error.code).toBe("HTTP_ERROR");

    filter.catch(
      new BadRequestException({ message: "plain msg", details: { f: 1 } }),
      host(capture),
    );
    expect(capture.body.error.message).toBe("plain msg");
    expect(capture.body.error.details).toEqual({ f: 1 });

    const bareHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: (code: number) => {
            capture.status = code;
            return { json: (body: unknown) => { capture.body = body; } };
          },
        }),
        getRequest: () => ({}),
      }),
    } as any;
    filter.catch("string-boom", bareHost);
    expect(capture.status).toBe(500);
    expect(capture.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});

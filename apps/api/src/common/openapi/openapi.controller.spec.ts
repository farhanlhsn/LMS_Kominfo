import { describe, expect, it } from "vitest";
import { OpenApiController } from "./openapi.controller";

describe("OpenApiController", () => {
  it("returns swagger document or fallback builder output", () => {
    const controller = new OpenApiController();
    const prev = (globalThis as any).__LMS_OPENAPI__;
    (globalThis as any).__LMS_OPENAPI__ = { openapi: "3.0.0", paths: {} };
    expect(controller.getJson({} as any)).toEqual({
      openapi: "3.0.0",
      paths: {},
    });
    delete (globalThis as any).__LMS_OPENAPI__;
    const doc = controller.getJson({} as any);
    expect(doc).toBeTruthy();
    if (prev !== undefined) (globalThis as any).__LMS_OPENAPI__ = prev;
  });

  it("returns html ui shell", () => {
    const controller = new OpenApiController();
    const html = controller.getUi();
    expect(html).toContain("swagger-ui");
    expect(html).toContain("/api/v1/docs");
  });
});

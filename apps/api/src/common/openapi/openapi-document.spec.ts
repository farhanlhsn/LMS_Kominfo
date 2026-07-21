import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./openapi-document";

describe("buildOpenApiDocument", () => {
  it("returns OpenAPI 3 document with core paths", () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.paths["/health"]).toBeTruthy();
    expect(doc.paths["/auth/login"]).toBeTruthy();
    expect(doc.paths["/payments/confirm"]).toBeTruthy();
    expect(doc.components.securitySchemes.bearerAuth).toBeTruthy();
  });
});

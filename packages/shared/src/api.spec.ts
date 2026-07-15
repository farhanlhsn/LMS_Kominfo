import { describe, expect, it } from "vitest";
import { createApiSuccess } from "./api";

describe("createApiSuccess", () => {
  it("returns data without meta", () => {
    expect(createApiSuccess({ id: 1 })).toEqual({
      success: true,
      data: { id: 1 },
    });
  });

  it("includes meta when provided", () => {
    expect(createApiSuccess("ok", { page: 1 })).toEqual({
      success: true,
      data: "ok",
      meta: { page: 1 },
    });
  });
});

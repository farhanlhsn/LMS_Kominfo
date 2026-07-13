import { describe, expect, it } from "vitest";
import { firstValueFrom, of } from "rxjs";
import { ResponseInterceptor } from "./response.interceptor";

function runInterceptor<T>(body: T) {
  const interceptor = new ResponseInterceptor<T>();
  const context = {} as any;
  const handler = { handle: () => of(body) } as any;
  return firstValueFrom(interceptor.intercept(context, handler));
}

describe("ResponseInterceptor", () => {
  it("wraps a primitive value as success payload", async () => {
    const result = await runInterceptor("hello");
    expect(result).toEqual({ success: true, data: "hello" });
  });

  it("wraps a raw array as success payload (controller returned array directly)", async () => {
    const result = await runInterceptor([{ id: "a" }, { id: "b" }]);
    expect(result).toEqual({ success: true, data: [{ id: "a" }, { id: "b" }] });
  });

  it("wraps a single object as success payload", async () => {
    const result = await runInterceptor({ id: "x", name: "Item" });
    expect(result).toEqual({ success: true, data: { id: "x", name: "Item" } });
  });

  it("unwraps { data, meta } paginated payloads", async () => {
    const result = await runInterceptor({
      data: [{ id: "a" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(result).toEqual({
      success: true,
      data: [{ id: "a" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it("unwraps { data: [...] } data-only wrappers (legacy list controllers)", async () => {
    const result = await runInterceptor({ data: [{ id: "a" }, { id: "b" }] });
    expect(result).toEqual({ success: true, data: [{ id: "a" }, { id: "b" }] });
  });

  it("unwraps { data: { ... } } data-only wrappers for single records", async () => {
    const result = await runInterceptor({ data: { id: "x", title: "Course" } });
    expect(result).toEqual({ success: true, data: { id: "x", title: "Course" } });
  });

  it("passes through an already-wrapped success response", async () => {
    const wrapped = { success: true, data: { id: "x" }, meta: { total: 1 } };
    const result = await runInterceptor(wrapped);
    expect(result).toBe(wrapped);
  });

  it("does not unwrap success-shaped payloads whose success flag is false", async () => {
    const error = { success: false, error: { code: "BOOM", message: "bad" } };
    const result = await runInterceptor(error);
    // Should leave error responses untouched so the global exception filter
    // remains the only source of error envelopes.
    expect(result).toBe(error);
  });
});

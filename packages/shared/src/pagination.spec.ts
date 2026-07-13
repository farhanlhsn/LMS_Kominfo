import { describe, expect, it } from "vitest";
import {
  cursorMeta,
  normalizeCursorLimit,
  normalizePageLimit,
  pageMeta,
} from "./pagination";

describe("pagination", () => {
  it("normalizes page/limit/skip", () => {
    expect(normalizePageLimit(2, 10)).toEqual({ page: 2, limit: 10, skip: 10 });
    expect(normalizePageLimit(0, 999).page).toBe(1);
    expect(normalizePageLimit(1, 999).limit).toBe(100);
  });

  it("builds page meta", () => {
    expect(pageMeta(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it("builds cursor meta with hasMore", () => {
    const rows = [
      { id: "a", createdAt: "1" },
      { id: "b", createdAt: "2" },
      { id: "c", createdAt: "3" },
    ];
    const { data, meta } = cursorMeta(rows, 2, (r) => r.createdAt);
    expect(data).toHaveLength(2);
    expect(meta.hasMore).toBe(true);
    expect(meta.nextCursor).toBe("2");
  });

  it("clamps cursor limit", () => {
    expect(normalizeCursorLimit(5)).toBe(5);
    expect(normalizeCursorLimit(500)).toBe(100);
  });
});

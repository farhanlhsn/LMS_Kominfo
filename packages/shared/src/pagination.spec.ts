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
    expect(normalizePageLimit(undefined, undefined)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
    expect(normalizePageLimit(Number.NaN, Number.NaN)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
    // 0 is falsy → falls back to DEFAULT_LIMIT then clamp
    expect(normalizePageLimit(1, 0).limit).toBe(20);
    expect(normalizePageLimit(3, 10, 5).limit).toBe(5);
  });

  it("builds page meta", () => {
    expect(pageMeta(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
    expect(pageMeta(1, 0, 10).totalPages).toBe(0);
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

  it("builds cursor meta without hasMore", () => {
    const { data, meta } = cursorMeta([{ id: "a" }], 5, (r) => r.id);
    expect(data).toHaveLength(1);
    expect(meta.hasMore).toBe(false);
    expect(meta.nextCursor).toBeNull();
  });

  it("handles empty cursor rows", () => {
    const { data, meta } = cursorMeta([], 10, () => "x");
    expect(data).toEqual([]);
    expect(meta.nextCursor).toBeNull();
    expect(meta.hasMore).toBe(false);
  });

  it("clamps cursor limit", () => {
    expect(normalizeCursorLimit(5)).toBe(5);
    expect(normalizeCursorLimit(500)).toBe(100);
    expect(normalizeCursorLimit(undefined)).toBe(20);
    expect(normalizeCursorLimit(Number.NaN)).toBe(20);
    expect(normalizeCursorLimit(0)).toBe(20);
    expect(normalizeCursorLimit(50, 10)).toBe(10);
  });
});


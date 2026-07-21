import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy class names with a single space", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("returns an empty string when no truthy class names are provided", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("returns a single class when only one is provided", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("preserves empty strings as falsy and skips them", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("returns the joined string when called with no arguments", () => {
    expect(cn()).toBe("");
  });
});

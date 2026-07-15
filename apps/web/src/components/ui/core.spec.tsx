import { describe, expect, it } from "vitest";
import { isExternalHref } from "./core-link";

describe("ButtonLink href classification", () => {
  it("treats relative paths as internal", () => {
    expect(isExternalHref("/courses")).toBe(false);
    expect(isExternalHref("/admin/orders")).toBe(false);
  });

  it("treats absolute and special schemes as external", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("mailto:a@b.c")).toBe(true);
    expect(isExternalHref("#section")).toBe(true);
  });
});

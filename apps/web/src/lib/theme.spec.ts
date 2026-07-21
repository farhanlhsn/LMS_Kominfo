import { describe, expect, it } from "vitest";
import { defaultTheme, resolveOrganizationTheme } from "./theme";

type ThemeStyle = Record<string, string | undefined>;

function asStyle(value: unknown): ThemeStyle {
  return value as ThemeStyle;
}

describe("defaultTheme", () => {
  it("exposes expected baseline tokens", () => {
    expect(defaultTheme.primary).toBe("174 77% 26%");
    expect(defaultTheme.radius).toBe("0.5rem");
  });
});

describe("resolveOrganizationTheme", () => {
  it("returns empty object when branding is missing", () => {
    expect(resolveOrganizationTheme()).toEqual({});
  });

  it("converts valid hex colors into HSL tokens", () => {
    const styles = asStyle(resolveOrganizationTheme({ primaryColor: "#2563eb" }));
    expect(styles["--primary"]).toMatch(/^\d+ \d+% \d+%$/);
  });

  it("ignores invalid hex colors", () => {
    const styles = asStyle(resolveOrganizationTheme({ primaryColor: "not-a-color" }));
    expect(styles["--primary"]).toBeUndefined();
  });

  it("keeps the radius when it matches the allowed scale", () => {
    const styles = asStyle(resolveOrganizationTheme({ radius: "0.75rem" }));
    expect(styles["--radius"]).toBe("0.75rem");
  });

  it("ignores radius values outside the allowed scale", () => {
    const styles = asStyle(resolveOrganizationTheme({ radius: "3rem" }));
    expect(styles["--radius"]).toBeUndefined();
  });

  it("handles shorthand hex colors", () => {
    const styles = asStyle(resolveOrganizationTheme({ accentColor: "#fff" }));
    expect(styles["--accent"]).toMatch(/^\d+ \d+% \d+%$/);
  });
});

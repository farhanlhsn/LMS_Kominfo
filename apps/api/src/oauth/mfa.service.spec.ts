import { describe, expect, it } from "vitest";
import { generateTotpCode } from "./mfa.service";

describe("generateTotpCode", () => {
  it("returns a 6-digit code", () => {
    const secret = Buffer.alloc(20, 1);
    const code = generateTotpCode(secret, 1_700_000_000_000);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is stable within the same 30s counter window", () => {
    const secret = Buffer.from("0123456789abcdef0123");
    // Align to start of a window so +15s stays in the same counter.
    const windowStart = Math.floor(1_700_000_000_000 / 30_000) * 30_000;
    const a = generateTotpCode(secret, windowStart);
    const b = generateTotpCode(secret, windowStart + 15_000);
    expect(a).toBe(b);
  });

  it("changes across windows", () => {
    const secret = Buffer.from("0123456789abcdef0123");
    const windowStart = Math.floor(1_700_000_000_000 / 30_000) * 30_000;
    const a = generateTotpCode(secret, windowStart);
    const b = generateTotpCode(secret, windowStart + 30_000);
    expect(a).not.toBe(b);
  });
});

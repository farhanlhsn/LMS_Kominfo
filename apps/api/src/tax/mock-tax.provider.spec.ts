import { describe, expect, it } from "vitest";
import { MockTaxProvider } from "./mock-tax.provider";

describe("MockTaxProvider", () => {
  it("computes tax lines and totals", () => {
    const provider = new MockTaxProvider();
    expect(provider.getIdentifier()).toBe("mock");
    const result = provider.computeTax(10000, [
      { rate: 10, inclusive: false, type: "VAT" },
      { rate: 5, inclusive: false, type: "GST" },
    ]);
    expect(result.taxAmount).toBe(1500);
    expect(result.total).toBe(11500);
    expect(result.lines).toHaveLength(2);
  });
});

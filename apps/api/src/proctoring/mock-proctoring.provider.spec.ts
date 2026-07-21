import { describe, expect, it } from "vitest";
import { MockProctoringProvider } from "./mock-proctoring.provider";

describe("MockProctoringProvider", () => {
  it("samples events and computes integrity scores", () => {
    const provider = new MockProctoringProvider();
    expect(provider.getIdentifier()).toBe("mock");
    const sample = provider.sampleEvent();
    expect(sample.type).toBeTruthy();
    expect(sample.severity).toBeTruthy();
    expect(provider.computeIntegrityScore([])).toBe(1);
    expect(
      provider.computeIntegrityScore([
        { severity: "LOW" },
        { severity: "HIGH" },
      ]),
    ).toBeLessThan(1);
  });
});

import { describe, expect, it } from "vitest";
import { MockPlagiarismProvider } from "./plagiarism.provider";

describe("MockPlagiarismProvider", () => {
  const provider = new MockPlagiarismProvider();

  it("returns empty-text result", async () => {
    const result = await provider.check({
      organizationId: "o",
      submissionId: "s",
      text: "   ",
      fileIds: [],
    });
    expect(result).toMatchObject({
      status: "COMPLETED",
      similarityScore: 0,
      details: { reason: "empty-text" },
    });
  });

  it("scores repetition and known source keywords", async () => {
    const result = await provider.check({
      organizationId: "o",
      submissionId: "s",
      text: "wikipedia wikipedia coursera common word",
      fileIds: [],
    });
    expect(result.matchedSources.length).toBeGreaterThan(0);
    expect(result.similarityScore).toBeGreaterThanOrEqual(0);
    expect(result.provider).toBe("mock");
  });
});

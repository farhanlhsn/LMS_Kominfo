import { describe, expect, it } from "vitest";
import { AiChunkerService } from "./ai-chunker.service";

describe("AiChunkerService", () => {
  it("creates ordered overlapping chunks with token estimates", () => {
    const chunks = new AiChunkerService().chunk(
      `${"Networking fundamentals explain TCP and UDP. ".repeat(30)}\n\n${"REST APIs connect clients and services. ".repeat(30)}`,
      300,
      40,
    );
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(
      chunks.map((_, index) => index),
    );
    expect(chunks.every((chunk) => chunk.tokenCount > 0)).toBe(true);
  });

  it("does not create chunks for blank text", () => {
    expect(new AiChunkerService().chunk("   ")).toEqual([]);
  });
});

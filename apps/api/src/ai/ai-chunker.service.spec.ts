import { describe, expect, it } from "vitest";
import { AiChunkerService } from "./ai-chunker.service";

describe("AiChunkerService", () => {
  const service = new AiChunkerService();

  it("returns empty for blank text", () => {
    expect(service.chunk("   ")).toEqual([]);
  });

  it("chunks paragraphs with overlap", () => {
    const text = Array.from({ length: 20 }, (_, i) => `Paragraph ${i}. ${"word ".repeat(40)}`).join(
      "\n\n",
    );
    const chunks = service.chunk(text, 200, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[0]?.tokenCount).toBeGreaterThan(0);
  });

  it("splits long paragraphs", () => {
    const long = Array.from({ length: 200 }, () => "word").join(" ");
    const chunks = service.chunk(long, 80, 10);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("clamps extreme target width", () => {
    const chunks = service.chunk("hello world", 0, 0);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("handles single short paragraph", () => {
    expect(service.chunk("short", 1200, 100)).toEqual([
      expect.objectContaining({ chunkIndex: 0, content: "short" }),
    ]);
  });
});


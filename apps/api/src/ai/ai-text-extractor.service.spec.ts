import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({
  default: vi.fn(async () => ({ text: "  pdf text  " })),
}));
vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(async () => ({ value: "  docx text  " })),
  },
}));

import { AiTextExtractorService } from "./ai-text-extractor.service";

describe("AiTextExtractorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers textContent and parses rich body", () => {
    const storage = { getFile: vi.fn() };
    const service = new AiTextExtractorService(storage as any);
    expect(service.fromRichContent(" plain ", null)).toBe("plain");
    expect(service.fromRichContent(null, { html: "<p>Hi &amp; you</p>" })).toContain(
      "Hi",
    );
    expect(service.fromRichContent(null, { text: "x" })).toBe("x");
    expect(service.fromRichContent(null, null)).toBe("");
    expect(service.fromRichContent(null, [])).toBe("");
  });

  it("extracts plain and markdown files", async () => {
    const storage = {
      getFile: vi.fn().mockResolvedValue(Buffer.from("# Title\nbody")),
    };
    const service = new AiTextExtractorService(storage as any);
    await expect(
      service.fromFile({
        bucket: "b",
        key: "k",
        mimeType: "text/markdown",
        originalFilename: "a.md",
      }),
    ).resolves.toContain("Title");
    await expect(
      service.fromFile({
        bucket: "b",
        key: "k",
        mimeType: "text/plain",
        originalFilename: "a.txt",
      }),
    ).resolves.toContain("Title");
  });

  it("rejects unsupported mime types", async () => {
    const storage = {
      getFile: vi.fn().mockResolvedValue(Buffer.from("x")),
    };
    const service = new AiTextExtractorService(storage as any);
    await expect(
      service.fromFile({
        bucket: "b",
        key: "k",
        mimeType: "image/png",
        originalFilename: "a.png",
      }),
    ).rejects.toThrow(/not supported/);
  });

  it("extracts pdf and docx via mocked parsers", async () => {
    const storage = {
      getFile: vi.fn().mockResolvedValue(Buffer.from("%PDF")),
    };
    const service = new AiTextExtractorService(storage as any);
    await expect(
      service.fromFile({
        bucket: "b",
        key: "k.pdf",
        mimeType: "application/pdf",
        originalFilename: "a.pdf",
      }),
    ).resolves.toBe("pdf text");
    await expect(
      service.fromFile({
        bucket: "b",
        key: "k.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalFilename: "a.docx",
      }),
    ).resolves.toBe("docx text");
  });
});

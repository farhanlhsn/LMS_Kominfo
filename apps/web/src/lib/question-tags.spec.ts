import { describe, expect, it } from "vitest";
import { mergeTags, parseTagInput } from "./question-tags";

describe("question-tags", () => {
  it("parses and dedupes tags", () => {
    expect(parseTagInput("Midterm, chapter-1; MIDTERM")).toEqual([
      "midterm",
      "chapter-1",
    ]);
  });

  it("merges tags", () => {
    expect(mergeTags(["a"], ["A", "b"])).toEqual(["a", "b"]);
  });
});

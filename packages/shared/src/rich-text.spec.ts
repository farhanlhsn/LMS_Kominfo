import { describe, expect, it } from "vitest";
import { htmlToPlainText, sanitizeRichTextHtml } from "./rich-text";

describe("rich text sanitizer", () => {
  it("keeps safe formatting tags", () => {
    expect(
      sanitizeRichTextHtml("<h2>Title</h2><p>Hello <strong>world</strong></p>"),
    ).toBe("<h2>Title</h2><p>Hello <strong>world</strong></p>");
  });

  it("removes scripts and unsafe attributes", () => {
    expect(
      sanitizeRichTextHtml(
        '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
      ),
    ).toBe("<p>Hi</p><a>bad</a>");
  });

  it("converts safe html to plain text", () => {
    expect(htmlToPlainText("<h2>Title</h2><p>Hello &amp; welcome</p>")).toBe(
      "Title\nHello & welcome",
    );
  });
});

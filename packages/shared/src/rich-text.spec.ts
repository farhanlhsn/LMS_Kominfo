import { describe, expect, it } from "vitest";
import { htmlToPlainText, sanitizeRichTextHtml } from "./rich-text";

describe("rich text sanitizer", () => {
  it("keeps safe formatting tags", () => {
    const out = sanitizeRichTextHtml(
      "<h2>Title</h2><p>Hello <strong>world</strong></p>",
    );
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<strong>world</strong>");
  });

  it("removes scripts and unsafe attributes", () => {
    const out = sanitizeRichTextHtml(
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    );
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
    expect(out).toContain("Hi");
  });

  it("blocks data/vbscript schemes on links", () => {
    const out = sanitizeRichTextHtml(
      '<a href="data:text/html,x">x</a><a href="https://example.com">ok</a>',
    );
    expect(out).not.toContain("data:");
    expect(out).toContain('href="https://example.com"');
  });

  it("converts safe html to plain text", () => {
    expect(htmlToPlainText("<h2>Title</h2><p>Hello &amp; welcome</p>")).toBe(
      "Title\nHello & welcome",
    );
    expect(htmlToPlainText("<p>a&nbsp;b &lt;c&gt; &quot;d&quot;</p>")).toContain(
      "a b <c> \"d\"",
    );
    expect(htmlToPlainText("<br/>line")).toContain("line");
  });

  it("handles empty and nullish input", () => {
    expect(sanitizeRichTextHtml("")).toBe("");
    expect(sanitizeRichTextHtml(undefined as unknown as string)).toBe("");
  });

  it("rewrites anchors without href", () => {
    const out = sanitizeRichTextHtml('<a name="top">top</a>');
    expect(out).toContain("top");
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });
});


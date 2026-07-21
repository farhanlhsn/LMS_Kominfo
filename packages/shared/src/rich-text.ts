import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h2",
  "h3",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "u",
  "ul",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...(attribs.href ? { href: attribs.href } : {}),
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
  },
};

/** Strip unsafe HTML for learner/instructor rich text (DOMPurify-class allowlist). */
export function sanitizeRichTextHtml(input: string) {
  return sanitizeHtml(input ?? "", SANITIZE_OPTIONS).trim();
}

export function htmlToPlainText(input: string) {
  return sanitizeRichTextHtml(input)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

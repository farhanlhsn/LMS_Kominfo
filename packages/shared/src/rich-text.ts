const allowedTags = new Set([
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
]);

function sanitizeAttributes(tagName: string, rawAttributes: string) {
  if (tagName !== "a") {
    return "";
  }

  const hrefMatch = rawAttributes.match(/\s href=(["'])(.*?)\1/i);
  const href = hrefMatch?.[2]?.trim();
  if (!href || /^(javascript|data|vbscript):/i.test(href)) {
    return "";
  }

  const safeHref = href.replace(/"/g, "&quot;");
  return ` href="${safeHref}" rel="noopener noreferrer" target="_blank"`;
}

export function sanitizeRichTextHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, tagName, attributes) => {
      const normalizedTag = String(tagName).toLowerCase();
      if (!allowedTags.has(normalizedTag)) {
        return "";
      }
      if (match.startsWith("</")) {
        return `</${normalizedTag}>`;
      }
      if (normalizedTag === "br") {
        return "<br>";
      }
      return `<${normalizedTag}${sanitizeAttributes(
        normalizedTag,
        String(attributes ?? ""),
      )}>`;
    })
    .trim();
}

export function htmlToPlainText(input: string) {
  return sanitizeRichTextHtml(input)
    .replace(/<br>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

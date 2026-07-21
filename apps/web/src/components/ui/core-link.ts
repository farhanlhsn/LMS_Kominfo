/** Shared by ButtonLink and unit tests. */
export function isExternalHref(href: string) {
  return (
    /^(https?:|mailto:|tel:)/i.test(href) ||
    href.startsWith("//") ||
    href.startsWith("#")
  );
}

/** @deprecated use isExternalHref */
export const isExternalHrefForTest = isExternalHref;

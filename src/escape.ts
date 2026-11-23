/** Escaping helpers; each value is escaped once, from its raw mdast `value` (docs/block-markup.md#escaping). */

/** Escape `&`, `<`, `>` in visible text content. `&` must be replaced first. */
export function escapeText(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped;
}

/** Escape `&`, `<`, `>` inside code (inline or block). Quotes are left as-is. */
export function escapeCode(value: string): string {
  const escaped = escapeText(value);
  return escaped;
}

/** Escape `&`, `"`, `<`, `>` for a double-quoted HTML attribute value. */
export function escapeAttribute(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped;
}

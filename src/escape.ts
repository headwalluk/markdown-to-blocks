/**
 * Escaping helpers. Text and code escape `& < >` once, from the raw mdast
 * `value`; attributes also escape `"`. See "Escaping discipline" in CLAUDE.md.
 */

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

/**
 * Escape a value destined for a double-quoted HTML attribute.
 * We escape `&` and `"` here so attribute values stay well-formed; `<`/`>`
 * inside attributes are harmless but we escape them too for tidiness.
 */
export function escapeAttribute(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped;
}

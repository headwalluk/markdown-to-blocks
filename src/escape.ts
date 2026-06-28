/**
 * Escaping helpers.
 *
 * Discipline (see hand-off §5.3 / §5.10):
 *  - Escape `&`, `<`, `>` only. Never escape `"` — neither code nor the
 *    attributes we emit require it.
 *  - Escape exactly once, straight from the raw mdast `value`. Formatting nodes
 *    emit tags directly and must not be re-escaped (double-encoding such as
 *    `&amp;lt;` is a bug).
 *
 * `escapeText` and `escapeCode` are intentionally identical in behaviour today;
 * they are kept separate so the call sites document intent and so the two can
 * diverge later without hunting down every caller.
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

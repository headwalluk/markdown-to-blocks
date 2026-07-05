/**
 * Serialise a block-attributes object into the ` {…}` suffix WordPress's own
 * serializer emits after `wp:name`. Returns "" for an empty object, matching
 * core (which omits the braces entirely when a block has no attributes).
 *
 * Key insertion order is preserved, so callers control attribute order to match
 * core's byte-for-byte output (e.g. `level` before `anchor`).
 *
 * The JSON is escaped exactly as `@wordpress/blocks` `serializeAttributes` does:
 * `--`, `<`, `>`, `&` and non-breaking space are `\u`-escaped so the JSON can
 * live inside an HTML `<!-- … -->` comment without prematurely closing it.
 */
export function serializeBlockAttributes(
  attributes: Record<string, unknown>,
): string {
  let out = "";
  if (Object.keys(attributes).length > 0) {
    const json = JSON.stringify(attributes)
      .replace(/--/g, "\\u002d\\u002d")
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/ /g, "\\u00a0");
    out = ` ${json}`;
  }
  return out;
}

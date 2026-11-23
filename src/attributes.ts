/** Serialise block attributes to the ` {…}` suffix core emits after `wp:name` (docs/block-markup.md#general-shape). */
export function serializeBlockAttributes(
  attributes: Record<string, unknown>,
): string {
  let suffix = "";
  if (Object.keys(attributes).length > 0) {
    const json = JSON.stringify(attributes)
      .replace(/--/g, "\\u002d\\u002d")
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u00a0/g, "\\u00a0");
    suffix = ` ${json}`;
  }
  return suffix;
}

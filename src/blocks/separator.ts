/** Thematic break → core/separator (docs/block-markup.md#separator). */
export function renderSeparator(): string {
  const inner = '<hr class="wp-block-separator has-alpha-channel-opacity"/>';
  return `<!-- wp:separator -->\n${inner}\n<!-- /wp:separator -->`;
}

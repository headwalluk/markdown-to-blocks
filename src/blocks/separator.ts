/**
 * Thematic break → core/separator.
 *
 * The class set (`has-alpha-channel-opacity`) is current-core and
 * version-sensitive; the validation harness polices it.
 */
export function renderSeparator(): string {
  const inner = '<hr class="wp-block-separator has-alpha-channel-opacity"/>';
  return `<!-- wp:separator -->\n${inner}\n<!-- /wp:separator -->`;
}

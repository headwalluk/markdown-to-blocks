import type { Blockquote } from "mdast";
import type { RenderContext } from "../types.js";

/** Blockquote → core/quote with inner blocks; whitespace per docs/block-markup.md#quote. */
export function renderQuote(node: Blockquote, context: RenderContext): string {
  const inner = context.renderBlocks(node.children).join("\n\n");
  const body = `<blockquote class="wp-block-quote">${inner}</blockquote>`;
  return `<!-- wp:quote -->\n${body}\n<!-- /wp:quote -->`;
}

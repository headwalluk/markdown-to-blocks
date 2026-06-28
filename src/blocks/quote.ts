import type { Blockquote } from "mdast";
import type { RenderContext } from "../types.js";

/**
 * Blockquote → core/quote (v2), which contains inner blocks (paragraphs,
 * headings, etc.) rather than raw text. We recurse through the dispatcher so any
 * supported block can nest inside.
 *
 * Whitespace matches WP: the first inner block's opening comment sits directly
 * after `<blockquote ...>`, inner blocks are separated by a blank line, and the
 * final closing comment attaches directly to `</blockquote>`.
 */
export function renderQuote(node: Blockquote, ctx: RenderContext): string {
  const inner = ctx.renderBlocks(node.children).join("\n\n");
  const body = `<blockquote class="wp-block-quote">${inner}</blockquote>`;
  return `<!-- wp:quote -->\n${body}\n<!-- /wp:quote -->`;
}

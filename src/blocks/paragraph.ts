import type { Image, Paragraph } from "mdast";
import type { RenderContext } from "../types.js";
import { renderImage } from "./image.js";

/**
 * Paragraph → core/paragraph.
 *
 * Two special cases first (guard clauses):
 *  - An empty paragraph (no rendered content) is dropped entirely.
 *  - A paragraph whose only child is an image becomes a core/image block, since
 *    Gutenberg has no inline image block.
 */
export function renderParagraph(
  node: Paragraph,
  ctx: RenderContext,
): string | null {
  if (node.children.length === 1 && node.children[0]?.type === "image") {
    return renderImage(node.children[0] as Image, ctx);
  }

  const inner = ctx.renderInline(node.children);
  if (inner.trim() === "") {
    return null;
  }

  return `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;
}

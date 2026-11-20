import type { Image, Link, Paragraph } from "mdast";
import type { RenderContext } from "../types.js";
import { renderImage } from "./image.js";

/**
 * Paragraph → core/paragraph.
 *
 * Special cases first (guard clauses):
 *  - An empty paragraph (no rendered content) is dropped entirely.
 *  - A paragraph whose only child is an image becomes a core/image block, since
 *    Gutenberg has no inline image block.
 *  - So does a paragraph whose only child is a link around only an image
 *    (`[![alt](src)](href)`): a linked core/image.
 */
export function renderParagraph(
  node: Paragraph,
  ctx: RenderContext,
): string | null {
  const only = node.children.length === 1 ? node.children[0] : undefined;
  if (only?.type === "image") {
    return renderImage(only as Image, ctx);
  }
  if (only?.type === "link" && only.children.length === 1 && only.children[0]?.type === "image") {
    return renderImage(only.children[0] as Image, ctx, only as Link);
  }

  const inner = ctx.renderInline(node.children);
  if (inner.trim() === "") {
    return null;
  }

  return `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;
}

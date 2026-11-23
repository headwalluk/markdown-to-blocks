import type { Image, Link, Paragraph } from "mdast";
import type { RenderContext } from "../types.js";
import { renderImage } from "./image.js";

/** Paragraph → core/paragraph, or core/image when it holds only an image (docs/block-markup.md#paragraph). */
export function renderParagraph(
  node: Paragraph,
  context: RenderContext,
): string | null {
  const only = node.children.length === 1 ? node.children[0] : undefined;
  if (only?.type === "image") {
    return renderImage(only as Image, context);
  }
  if (only?.type === "link" && only.children.length === 1 && only.children[0]?.type === "image") {
    return renderImage(only.children[0] as Image, context, only as Link);
  }

  const inner = context.renderInline(node.children);
  if (inner.trim() === "") {
    return null;
  }

  return `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;
}

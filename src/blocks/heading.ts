import type { Heading, PhrasingContent } from "mdast";
import { serializeBlockAttributes } from "../attributes.js";
import type { RenderContext } from "../types.js";

/**
 * Heading → core/heading.
 *
 * Apply `headingShift`, then clamp into [minHeadingLevel, 6]. Level 2 is the
 * block default and omits the `level` attribute; all other levels carry it.
 * The `wp-block-heading` class is current-core (WP 5.9+).
 *
 * With `headingAnchors`, derive an `id`/`anchor` from the heading text (via the
 * per-document slugger). Attribute order matches core's serializer: `level`
 * before `anchor`; on the tag, `id` before `class`.
 */
export function renderHeading(node: Heading, ctx: RenderContext): string {
  const { headingShift, minHeadingLevel, headingAnchors } = ctx.options;
  const shifted = node.depth + headingShift;
  const level = Math.min(6, Math.max(minHeadingLevel, shifted));
  const inner = ctx.renderInline(node.children);
  const anchor = headingAnchors
    ? ctx.slugger.slug(headingText(node.children))
    : "";

  const attributes: Record<string, unknown> = {};
  if (level !== 2) {
    attributes.level = level;
  }
  if (anchor !== "") {
    attributes.anchor = anchor;
  }

  // The slug is limited to [\p{L}\p{N}_-], so it needs no attribute escaping.
  const idAttr = anchor !== "" ? ` id="${anchor}"` : "";
  const open = `<!-- wp:heading${serializeBlockAttributes(attributes)} -->`;
  const tag = `<h${level}${idAttr} class="wp-block-heading">${inner}</h${level}>`;
  const close = "<!-- /wp:heading -->";
  return `${open}\n${tag}\n${close}`;
}

/**
 * Flatten a heading's phrasing children to plain text for slugging: concatenate
 * raw text/code values, ignoring formatting tags (bold/italic/links) so the
 * anchor reflects the words, not the markup.
 */
function headingText(nodes: PhrasingContent[]): string {
  let text = "";
  for (const node of nodes) {
    const value = (node as { value?: string }).value;
    const children = (node as { children?: PhrasingContent[] }).children;
    if (typeof value === "string") {
      text += value;
    } else if (children != null) {
      text += headingText(children);
    }
  }
  return text;
}

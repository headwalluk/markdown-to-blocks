import type { Heading, PhrasingContent } from "mdast";
import { serializeBlockAttributes } from "../attributes.js";
import { MAX_HEADING_LEVEL, type RenderContext } from "../types.js";

/** core/heading's default level; a heading at it carries no `level` attribute. */
const CORE_DEFAULT_LEVEL = 2;

/** Heading → core/heading: shift, clamp and optional anchor per docs/block-markup.md#heading. */
export function renderHeading(node: Heading, context: RenderContext): string {
  const { headingShift, minHeadingLevel, headingAnchors } = context.options;
  const shifted = node.depth + headingShift;
  const level = Math.min(MAX_HEADING_LEVEL, Math.max(minHeadingLevel, shifted));
  const inner = context.renderInline(node.children);
  const anchor = headingAnchors
    ? context.slugger.slug(headingText(node.children))
    : "";

  const attributes: Record<string, unknown> = {};
  if (level !== CORE_DEFAULT_LEVEL) {
    attributes.level = level;
  }
  if (anchor !== "") {
    attributes.anchor = anchor;
  }

  // The slug is limited to [\p{L}\p{N}_-], so it needs no attribute escaping.
  const idAttribute = anchor !== "" ? ` id="${anchor}"` : "";
  const open = `<!-- wp:heading${serializeBlockAttributes(attributes)} -->`;
  const tag = `<h${level}${idAttribute} class="wp-block-heading">${inner}</h${level}>`;
  const close = "<!-- /wp:heading -->";
  return `${open}\n${tag}\n${close}`;
}

/** Flatten a heading's children to plain text for slugging, ignoring formatting. */
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

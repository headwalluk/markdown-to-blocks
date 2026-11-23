import type { List, ListItem } from "mdast";
import { serializeBlockAttributes } from "../attributes.js";
import type { RenderContext } from "../types.js";

/** List → core/list of core/list-item blocks; whitespace per docs/block-markup.md#list. */
export function renderList(node: List, context: RenderContext): string {
  const tag = node.ordered ? "ol" : "ul";
  const attributes: Record<string, unknown> = {};
  let startAttribute = "";
  if (node.ordered) {
    attributes.ordered = true;
    if (node.start != null && node.start !== 1) {
      attributes.start = node.start;
      startAttribute = ` start="${node.start}"`;
    }
  }
  const serialisedAttributes = serializeBlockAttributes(attributes);

  const items: string[] = [];
  for (const child of node.children) {
    items.push(renderListItem(child, context));
  }

  const inner = `<${tag}${startAttribute} class="wp-block-list">${items.join("\n\n")}</${tag}>`;
  return `<!-- wp:list${serialisedAttributes} -->\n${inner}\n<!-- /wp:list -->`;
}

function renderListItem(node: ListItem, context: RenderContext): string {
  const textParts: string[] = [];
  const nestedParts: string[] = [];

  for (const child of node.children) {
    if (child.type === "list") {
      nestedParts.push(renderList(child, context));
    } else if (child.type === "paragraph") {
      textParts.push(context.renderInline(child.children));
    } else {
      // Loose item content we don't render inline (rare): dispatch as a block
      // and keep it, so nothing is silently dropped.
      const block = context.renderBlock(child);
      if (block != null) {
        nestedParts.push(block);
      }
    }
  }

  // GFM task-list checkbox → leading glyph (no interactive input in v1).
  const checkbox =
    node.checked == null ? "" : node.checked ? "☑ " : "☐ ";

  const text = checkbox + textParts.join("<br>");
  const nested = nestedParts.join("");
  const itemMarkup = `<li>${text}${nested}</li>`;
  return `<!-- wp:list-item -->\n${itemMarkup}\n<!-- /wp:list-item -->`;
}

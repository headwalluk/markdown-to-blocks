import type { List, ListItem } from "mdast";
import type { RenderContext } from "../types.js";

/**
 * List → core/list containing core/list-item children (WP 6.0+).
 *
 * Whitespace is exact and load-bearing (hand-off §5.4):
 *  - the first `<!-- wp:list-item -->` sits on the SAME line as the opening
 *    `<ul|ol class="wp-block-list">`;
 *  - list items are separated by one blank line;
 *  - the final `<!-- /wp:list-item -->` attaches directly to `</ul|ol>`.
 *
 * A nested list lives INSIDE its parent `<li>`, immediately after the item text
 * and before `</li>`.
 */
export function renderList(node: List, ctx: RenderContext): string {
  const tag = node.ordered ? "ol" : "ul";
  const attrs = node.ordered ? ' {"ordered":true}' : "";

  const items: string[] = [];
  for (const child of node.children) {
    items.push(renderListItem(child, ctx));
  }

  const inner = `<${tag} class="wp-block-list">${items.join("\n\n")}</${tag}>`;
  return `<!-- wp:list${attrs} -->\n${inner}\n<!-- /wp:list -->`;
}

function renderListItem(node: ListItem, ctx: RenderContext): string {
  const textParts: string[] = [];
  const nestedParts: string[] = [];

  for (const child of node.children) {
    if (child.type === "list") {
      nestedParts.push(renderList(child, ctx));
    } else if (child.type === "paragraph") {
      textParts.push(ctx.renderInline(child.children));
    } else {
      // Loose item content we don't render inline (rare): dispatch as a block
      // and keep it, so nothing is silently dropped.
      const block = ctx.renderBlock(child);
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
  const li = `<li>${text}${nested}</li>`;
  return `<!-- wp:list-item -->\n${li}\n<!-- /wp:list-item -->`;
}

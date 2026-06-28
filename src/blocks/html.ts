import type { Html } from "mdast";
import type { RenderContext } from "../types.js";

/**
 * Raw block HTML → core/html. Content is passed through verbatim (never
 * escaped). Honours the `unsupported: 'skip'` option by dropping the node.
 */
export function renderHtml(node: Html, ctx: RenderContext): string | null {
  if (ctx.options.unsupported === "skip") {
    return null;
  }
  return `<!-- wp:html -->\n${node.value}\n<!-- /wp:html -->`;
}

import type { Html } from "mdast";
import type { RenderContext } from "../types.js";

/** Raw block HTML → core/html, verbatim; dropped under `unsupported: 'skip'`. */
export function renderHtml(node: Html, context: RenderContext): string | null {
  if (context.options.unsupported === "skip") {
    return null;
  }
  return `<!-- wp:html -->\n${node.value}\n<!-- /wp:html -->`;
}

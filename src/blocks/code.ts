import type { Code } from "mdast";
import { escapeAttribute, escapeCode } from "../escape.js";
import type { RenderContext } from "../types.js";

/** Fenced or indented code → core/code; escaping per docs/block-markup.md#escaping. */
export function renderCode(node: Code, context: RenderContext): string {
  const body = escapeShortcodesAndEmbeds(escapeCode(node.value));
  let codeOpen = "<code>";
  if (context.options.codeLanguage === "class" && node.lang) {
    codeOpen = `<code class="language-${escapeAttribute(node.lang)}">`;
  }
  const inner = `<pre class="wp-block-code">${codeOpen}${body}</code></pre>`;
  return `<!-- wp:code -->\n${inner}\n<!-- /wp:code -->`;
}

/** Apply core/code's save-time escape(): `[` → `&#91;`, the first isolated URL's `//` → `&#47;&#47;`. */
function escapeShortcodesAndEmbeds(html: string): string {
  // Core's regex has no `g` flag, so only the first isolated URL is escaped.
  const escaped = html
    .replace(/\[/g, "&#91;")
    .replace(/^(\s*https?:)\/\/([^\s<>"]+\s*)$/m, "$1&#47;&#47;$2");
  return escaped;
}

import type { Code } from "mdast";
import { escapeCode } from "../escape.js";
import type { RenderContext } from "../types.js";

/**
 * Fenced / indented code → core/code.
 *
 * Only `& < >` are escaped; quotes are left verbatim. Newlines are preserved.
 * The fence language is discarded by default (core has no highlighting); with
 * `codeLanguage: 'class'` it is emitted as `language-xxx` for a syntax plugin —
 * opt-in, not core behaviour.
 */
export function renderCode(node: Code, ctx: RenderContext): string {
  const body = escapeCode(node.value);
  let codeOpen = "<code>";
  if (ctx.options.codeLanguage === "class" && node.lang) {
    codeOpen = `<code class="language-${node.lang}">`;
  }
  const inner = `<pre class="wp-block-code">${codeOpen}${body}</code></pre>`;
  return `<!-- wp:code -->\n${inner}\n<!-- /wp:code -->`;
}

import type { Code } from "mdast";
import { escapeAttribute, escapeCode } from "../escape.js";
import type { RenderContext } from "../types.js";

/**
 * Fenced / indented code → core/code.
 *
 * Only `& < >` are escaped; quotes are left verbatim. Newlines are preserved.
 * `escapeShortcodesAndEmbeds` then applies core/code's own save-time escaping.
 * The fence language is discarded by default (core has no highlighting); with
 * `codeLanguage: 'class'` it is emitted as `language-xxx` for a syntax plugin —
 * opt-in, not core behaviour.
 */
export function renderCode(node: Code, ctx: RenderContext): string {
  const body = escapeShortcodesAndEmbeds(escapeCode(node.value));
  let codeOpen = "<code>";
  if (ctx.options.codeLanguage === "class" && node.lang) {
    codeOpen = `<code class="language-${escapeAttribute(node.lang)}">`;
  }
  const inner = `<pre class="wp-block-code">${codeOpen}${body}</code></pre>`;
  return `<!-- wp:code -->\n${inner}\n<!-- /wp:code -->`;
}

/**
 * Mirror core/code's `escape()` (block-library `code/utils.js`): `[` becomes
 * `&#91;` so shortcodes don't run, and the first URL alone on its line gets
 * `&#47;&#47;` so it isn't auto-embedded.
 */
function escapeShortcodesAndEmbeds(html: string): string {
  // Core's regex has no `g` flag, so only the first isolated URL is escaped.
  const escaped = html
    .replace(/\[/g, "&#91;")
    .replace(/^(\s*https?:)\/\/([^\s<>"]+\s*)$/m, "$1&#47;&#47;$2");
  return escaped;
}

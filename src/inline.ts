import type {
  Delete,
  Emphasis,
  Html,
  Image,
  InlineCode,
  Link,
  PhrasingContent,
  Strong,
  Text,
} from "mdast";
import { escapeAttribute, escapeCode, escapeText } from "./escape.js";
import { resolveMarkdownImage } from "./resolve-image.js";
import type { ResolvedOptions } from "./types.js";
import { isSafeLinkUrl } from "./url.js";

/**
 * Render a list of inline (phrasing) mdast nodes to an HTML string.
 *
 * SESE: build a `parts` accumulator and return once at the end. Formatting
 * nodes emit tags directly; only raw text / code values pass through the
 * escapers, so nothing is escaped twice.
 */
export function renderInline(
  nodes: PhrasingContent[],
  options: ResolvedOptions,
): string {
  const parts: string[] = [];
  for (const node of nodes) {
    parts.push(renderInlineNode(node, options));
  }
  return parts.join("");
}

function renderInlineNode(
  node: PhrasingContent,
  options: ResolvedOptions,
): string {
  let out = "";
  switch (node.type) {
    case "text":
      out = escapeText((node as Text).value);
      break;
    case "strong":
      out = `<strong>${renderInline((node as Strong).children, options)}</strong>`;
      break;
    case "emphasis":
      out = `<em>${renderInline((node as Emphasis).children, options)}</em>`;
      break;
    case "delete":
      out = `<s>${renderInline((node as Delete).children, options)}</s>`;
      break;
    case "inlineCode":
      out = `<code>${escapeCode((node as InlineCode).value)}</code>`;
      break;
    case "break":
      // Hard line break inside a paragraph.
      out = "<br>";
      break;
    case "link":
      out = renderLink(node as Link, options);
      break;
    case "image":
      out = renderInlineImage(node as Image, options);
      break;
    case "html":
      // Raw inline HTML is passed through verbatim, or dropped under 'skip'.
      out = options.unsupported === "skip" ? "" : (node as Html).value;
      break;
    default:
      // Unknown / unhandled phrasing node: recurse into children if any,
      // otherwise fall back to its raw value, otherwise drop it.
      out = renderUnknownInline(node, options);
      break;
  }
  return out;
}

/** Render a link, or only its text when the url fails the `urlSchemes` policy. */
function renderLink(node: Link, options: ResolvedOptions): string {
  const inner = renderInline(node.children, options);
  let out = inner;
  if (options.urlSchemes === "any" || isSafeLinkUrl(node.url)) {
    const href = escapeAttribute(node.url);
    const title =
      node.title != null && node.title !== ""
        ? ` title="${escapeAttribute(node.title)}"`
        : "";
    out = `<a href="${href}"${title}>${inner}</a>`;
  }
  return out;
}

/**
 * Inline image (image mixed with text inside a paragraph). Block-level
 * standalone images are handled by the image block renderer; this is the
 * fallback for the mixed case, emitting a bare <img>, or nothing when the url
 * fails the `urlSchemes` policy.
 */
function renderInlineImage(node: Image, options: ResolvedOptions): string {
  const image = resolveMarkdownImage(node, options);
  let out = "";
  if (image != null) {
    const altAttr = ` alt="${escapeAttribute(image.alt ?? "")}"`;
    const idClass = image.id != null ? ` class="wp-image-${image.id}"` : "";
    out = `<img src="${escapeAttribute(image.url)}"${altAttr}${idClass}/>`;
  }
  return out;
}

function renderUnknownInline(
  node: PhrasingContent,
  options: ResolvedOptions,
): string {
  let out = "";
  const maybeChildren = (node as { children?: PhrasingContent[] }).children;
  const maybeValue = (node as { value?: string }).value;
  if (maybeChildren != null) {
    out = renderInline(maybeChildren, options);
  } else if (typeof maybeValue === "string") {
    out = escapeText(maybeValue);
  }
  return out;
}

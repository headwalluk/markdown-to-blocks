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
import type { ResolvedOptions } from "./types.js";

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
      // Raw inline HTML is passed through verbatim (not escaped).
      out = (node as Html).value;
      break;
    default:
      // Unknown / unhandled phrasing node: recurse into children if any,
      // otherwise fall back to its raw value, otherwise drop it.
      out = renderUnknownInline(node, options);
      break;
  }
  return out;
}

function renderLink(node: Link, options: ResolvedOptions): string {
  const href = escapeAttribute(node.url);
  const title =
    node.title != null && node.title !== ""
      ? ` title="${escapeAttribute(node.title)}"`
      : "";
  const inner = renderInline(node.children, options);
  return `<a href="${href}"${title}>${inner}</a>`;
}

/**
 * Inline image (image mixed with text inside a paragraph). Block-level
 * standalone images are handled by the image block renderer; this is the
 * fallback for the mixed case, emitting a bare <img>.
 */
function renderInlineImage(node: Image, options: ResolvedOptions): string {
  const alt = node.alt ?? "";
  const resolved = options.resolveImage?.(node.url, alt, node.title ?? undefined);
  const url = resolved?.url ?? node.url;
  const altText = resolved?.alt ?? alt;
  const altAttr = ` alt="${escapeAttribute(altText)}"`;
  const idClass =
    resolved?.id != null ? ` class="wp-image-${resolved.id}"` : "";
  return `<img src="${escapeAttribute(url)}"${altAttr}${idClass}/>`;
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

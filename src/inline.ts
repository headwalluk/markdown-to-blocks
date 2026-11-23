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

/** Render inline (phrasing) nodes to HTML, escaping only raw text and code values. */
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
  let markup: string;
  switch (node.type) {
    case "text":
      markup = escapeText((node as Text).value);
      break;
    case "strong":
      markup = `<strong>${renderInline((node as Strong).children, options)}</strong>`;
      break;
    case "emphasis":
      markup = `<em>${renderInline((node as Emphasis).children, options)}</em>`;
      break;
    case "delete":
      markup = `<s>${renderInline((node as Delete).children, options)}</s>`;
      break;
    case "inlineCode":
      markup = `<code>${escapeCode((node as InlineCode).value)}</code>`;
      break;
    case "break":
      // Hard line break inside a paragraph.
      markup = "<br>";
      break;
    case "link":
      markup = renderLink(node as Link, options);
      break;
    case "image":
      markup = renderInlineImage(node as Image, options);
      break;
    case "html":
      // Raw inline HTML is passed through verbatim, or dropped under 'skip'.
      markup = options.unsupported === "skip" ? "" : (node as Html).value;
      break;
    default:
      // Unknown / unhandled phrasing node: recurse into children if any,
      // otherwise fall back to its raw value, otherwise drop it.
      markup = renderUnknownInline(node, options);
      break;
  }
  return markup;
}

/** Render a link, or only its text when the url fails the `urlSchemes` policy. */
function renderLink(node: Link, options: ResolvedOptions): string {
  const inner = renderInline(node.children, options);
  let markup = inner;
  if (options.urlSchemes === "any" || isSafeLinkUrl(node.url)) {
    const href = escapeAttribute(node.url);
    const title =
      node.title != null && node.title !== ""
        ? ` title="${escapeAttribute(node.title)}"`
        : "";
    markup = `<a href="${href}"${title}>${inner}</a>`;
  }
  return markup;
}

/** An image mixed with text: a bare `<img>`, or nothing when its URL fails the `urlSchemes` policy. */
function renderInlineImage(node: Image, options: ResolvedOptions): string {
  const image = resolveMarkdownImage(node, options);
  let markup = "";
  if (image != null) {
    const altAttribute = ` alt="${escapeAttribute(image.alt ?? "")}"`;
    const idClass = image.id != null ? ` class="wp-image-${image.id}"` : "";
    markup = `<img src="${escapeAttribute(image.url)}"${altAttribute}${idClass}/>`;
  }
  return markup;
}

function renderUnknownInline(
  node: PhrasingContent,
  options: ResolvedOptions,
): string {
  let markup = "";
  const maybeChildren = (node as { children?: PhrasingContent[] }).children;
  const maybeValue = (node as { value?: string }).value;
  if (maybeChildren != null) {
    markup = renderInline(maybeChildren, options);
  } else if (typeof maybeValue === "string") {
    markup = escapeText(maybeValue);
  }
  return markup;
}

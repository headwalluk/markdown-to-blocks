import type { Image, Link } from "mdast";
import { serializeBlockAttributes } from "../attributes.js";
import { escapeAttribute, escapeText } from "../escape.js";
import { resolveMarkdownImage } from "../resolve-image.js";
import type { RenderContext, ResolvedImage } from "../types.js";
import { isSafeLinkUrl } from "../url.js";

/** Where a linked image's link points, as core/image records it. */
type LinkDestination = "none" | "media" | "custom";

/** An image's link: its href, and whether it's the image's own file. */
interface ImageLink {
  href: string;
  destination: LinkDestination;
}

/** Image → core/image, library or external shape, linked and captioned per docs/block-markup.md#image. */
export function renderImage(
  node: Image,
  context: RenderContext,
  link?: Link,
): string | null {
  const image = resolveMarkdownImage(node, context.options);
  let markup: string | null = null;
  if (image != null) {
    const caption = image.caption ?? node.title ?? undefined;
    const imageLink = link != null ? resolveImageLink(link, image.url, context) : null;
    markup =
      image.id != null
        ? renderLibraryImage(image, image.id, caption, imageLink)
        : renderExternalImage(image, caption, imageLink);
  }
  return markup;
}

function renderLibraryImage(
  image: ResolvedImage,
  id: number,
  caption: string | undefined,
  link: ImageLink | null,
): string {
  const sizeSlug = image.sizeSlug;

  const attributes: Record<string, unknown> = { id };
  if (sizeSlug != null) {
    attributes.sizeSlug = sizeSlug;
  }
  attributes.linkDestination = link?.destination ?? "none";

  const figureClass =
    sizeSlug != null
      ? `wp-block-image size-${escapeAttribute(sizeSlug)}`
      : "wp-block-image";

  const imageTag =
    `<img src="${escapeAttribute(image.url)}"` +
    ` alt="${escapeAttribute(image.alt ?? "")}"` +
    ` class="wp-image-${id}"/>`;

  const inner = `<figure class="${figureClass}">${wrapInLink(imageTag, link)}${renderCaption(caption)}</figure>`;
  return `<!-- wp:image${serializeBlockAttributes(attributes)} -->\n${inner}\n<!-- /wp:image -->`;
}

function renderExternalImage(
  image: ResolvedImage,
  caption: string | undefined,
  link: ImageLink | null,
): string {
  const imageTag = `<img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt ?? "")}"/>`;
  const attributes: Record<string, unknown> = {};
  if (link != null) {
    attributes.linkDestination = link.destination;
  }
  const inner = `<figure class="wp-block-image">${wrapInLink(imageTag, link)}${renderCaption(caption)}</figure>`;
  return `<!-- wp:image${serializeBlockAttributes(attributes)} -->\n${inner}\n<!-- /wp:image -->`;
}

/** The image's link, or null when its href fails the `urlSchemes` policy. */
function resolveImageLink(
  link: Link,
  imageUrl: string,
  context: RenderContext,
): ImageLink | null {
  const allowed = context.options.urlSchemes === "any" || isSafeLinkUrl(link.url);
  let imageLink: ImageLink | null = null;
  if (allowed) {
    imageLink = {
      href: link.url,
      destination: isSameMediaFile(link.url, imageUrl) ? "media" : "custom",
    };
  }
  return imageLink;
}

function wrapInLink(imageTag: string, link: ImageLink | null): string {
  return link != null ? `<a href="${escapeAttribute(link.href)}">${imageTag}</a>` : imageTag;
}

/** Whether `href` is the same upload as `src`, ignoring query, fragment and WordPress size suffixes. */
export function isSameMediaFile(href: string, src: string): boolean {
  const hrefFile = mediaFileKey(href);
  const srcFile = mediaFileKey(src);
  const hostsMatch = hrefFile.host == null || srcFile.host == null || hrefFile.host === srcFile.host;
  return hostsMatch && hrefFile.path !== "" && hrefFile.path === srcFile.path;
}

interface MediaFileKey {
  host: string | null;
  path: string;
}

function mediaFileKey(url: string): MediaFileKey {
  const withoutSuffix = url.replace(/[?#].*$/, "");
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/]*)(.*)$/i.exec(withoutSuffix);
  const host = match?.[1] != null ? match[1].toLowerCase() : null;
  const path = match != null ? (match[2] ?? "") : withoutSuffix;
  const basePath = path
    .replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1")
    .replace(/-scaled(\.[a-z0-9]+)$/i, "$1");
  return { host, path: basePath };
}

function renderCaption(caption: string | undefined): string {
  if (caption == null || caption === "") {
    return "";
  }
  return `<figcaption class="wp-element-caption">${escapeText(caption)}</figcaption>`;
}

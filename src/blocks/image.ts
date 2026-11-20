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

/**
 * Image → core/image, driven by the injectable `resolveImage` option.
 *
 *  - When the resolver returns an attachment `id`, we emit the "library" shape:
 *    a `wp:image` comment carrying id (+ sizeSlug + linkDestination), a
 *    `size-<slug>` figure class, and a `wp-image-<id>` class on the <img>.
 *  - Otherwise we emit the "external" fallback: a bare figure/img with no id.
 *  - An image whose url fails the `urlSchemes` policy is dropped (null).
 *
 * A linked image (`[![alt](src)](href)`) wraps the <img> in `<a href>`, with
 * `linkDestination` "media" when the href is the image's own file (any size
 * WordPress made of it) and "custom" otherwise. A link whose href fails the
 * `urlSchemes` policy is dropped and the image renders unlinked.
 *
 * The caption is the resolver's `caption`, else the Markdown image title
 * (`![alt](src "Caption")`), rendered as `<figcaption class="wp-element-caption">`
 * (current core shape; version-sensitive — the harness polices it).
 */
export function renderImage(
  node: Image,
  ctx: RenderContext,
  link?: Link,
): string | null {
  const image = resolveMarkdownImage(node, ctx.options);
  let out: string | null = null;
  if (image != null) {
    const caption = image.caption ?? node.title ?? undefined;
    const imageLink = link != null ? resolveImageLink(link, image.url, ctx) : null;
    out =
      image.id != null
        ? renderLibraryImage(image, image.id, caption, imageLink)
        : renderExternalImage(image, caption, imageLink);
  }
  return out;
}

function renderLibraryImage(
  image: ResolvedImage,
  id: number,
  caption: string | undefined,
  link: ImageLink | null,
): string {
  const sizeSlug = image.sizeSlug;

  const attrs: Record<string, unknown> = { id };
  if (sizeSlug != null) {
    attrs.sizeSlug = sizeSlug;
  }
  attrs.linkDestination = link?.destination ?? "none";

  const figureClass =
    sizeSlug != null
      ? `wp-block-image size-${escapeAttribute(sizeSlug)}`
      : "wp-block-image";

  const img =
    `<img src="${escapeAttribute(image.url)}"` +
    ` alt="${escapeAttribute(image.alt ?? "")}"` +
    ` class="wp-image-${id}"/>`;

  const inner = `<figure class="${figureClass}">${wrapInLink(img, link)}${renderCaption(caption)}</figure>`;
  return `<!-- wp:image${serializeBlockAttributes(attrs)} -->\n${inner}\n<!-- /wp:image -->`;
}

function renderExternalImage(
  image: ResolvedImage,
  caption: string | undefined,
  link: ImageLink | null,
): string {
  const img = `<img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt ?? "")}"/>`;
  const attrs: Record<string, unknown> = {};
  if (link != null) {
    attrs.linkDestination = link.destination;
  }
  const inner = `<figure class="wp-block-image">${wrapInLink(img, link)}${renderCaption(caption)}</figure>`;
  return `<!-- wp:image${serializeBlockAttributes(attrs)} -->\n${inner}\n<!-- /wp:image -->`;
}

/** The image's link, or null when its href fails the `urlSchemes` policy. */
function resolveImageLink(
  link: Link,
  imageUrl: string,
  ctx: RenderContext,
): ImageLink | null {
  const allowed = ctx.options.urlSchemes === "any" || isSafeLinkUrl(link.url);
  let imageLink: ImageLink | null = null;
  if (allowed) {
    imageLink = {
      href: link.url,
      destination: isSameMediaFile(link.url, imageUrl) ? "media" : "custom",
    };
  }
  return imageLink;
}

function wrapInLink(img: string, link: ImageLink | null): string {
  return link != null ? `<a href="${escapeAttribute(link.href)}">${img}</a>` : img;
}

/**
 * Whether `href` is the same upload as `src`: the same path once the query,
 * fragment and WordPress's generated-size suffixes (`-1024x768`, `-scaled`)
 * are removed. A relative URL is compared by path alone.
 */
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

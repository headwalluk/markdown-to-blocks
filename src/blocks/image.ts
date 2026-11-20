import type { Image } from "mdast";
import { serializeBlockAttributes } from "../attributes.js";
import { escapeAttribute, escapeText } from "../escape.js";
import { resolveMarkdownImage } from "../resolve-image.js";
import type { RenderContext, ResolvedImage } from "../types.js";

/**
 * Image → core/image, driven by the injectable `resolveImage` option.
 *
 *  - When the resolver returns an attachment `id`, we emit the "library" shape:
 *    a `wp:image` comment carrying id (+ sizeSlug + linkDestination), a
 *    `size-<slug>` figure class, and a `wp-image-<id>` class on the <img>.
 *  - Otherwise we emit the "external" fallback: a bare figure/img with no id.
 *  - An image whose url fails the `urlSchemes` policy is dropped (null).
 *
 * An optional caption renders as a `<figcaption class="wp-element-caption">`
 * (current core shape; version-sensitive — the harness polices it).
 */
export function renderImage(node: Image, ctx: RenderContext): string | null {
  const image = resolveMarkdownImage(node, ctx.options);
  let out: string | null = null;
  if (image != null) {
    out = image.id != null ? renderLibraryImage(image, image.id) : renderExternalImage(image);
  }
  return out;
}

function renderLibraryImage(image: ResolvedImage, id: number): string {
  const sizeSlug = image.sizeSlug;

  const attrs: Record<string, unknown> = { id };
  if (sizeSlug != null) {
    attrs.sizeSlug = sizeSlug;
  }
  attrs.linkDestination = "none";

  const figureClass =
    sizeSlug != null
      ? `wp-block-image size-${escapeAttribute(sizeSlug)}`
      : "wp-block-image";

  const img =
    `<img src="${escapeAttribute(image.url)}"` +
    ` alt="${escapeAttribute(image.alt ?? "")}"` +
    ` class="wp-image-${id}"/>`;

  const caption = renderCaption(image.caption);
  const inner = `<figure class="${figureClass}">${img}${caption}</figure>`;
  return `<!-- wp:image${serializeBlockAttributes(attrs)} -->\n${inner}\n<!-- /wp:image -->`;
}

function renderExternalImage(image: ResolvedImage): string {
  const img = `<img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt ?? "")}"/>`;
  const caption = renderCaption(image.caption);
  const inner = `<figure class="wp-block-image">${img}${caption}</figure>`;
  return `<!-- wp:image -->\n${inner}\n<!-- /wp:image -->`;
}

function renderCaption(caption: string | undefined): string {
  if (caption == null || caption === "") {
    return "";
  }
  return `<figcaption class="wp-element-caption">${escapeText(caption)}</figcaption>`;
}

import type { Image } from "mdast";
import { escapeAttribute, escapeText } from "../escape.js";
import type { RenderContext, ResolvedImage } from "../types.js";

/**
 * Image → core/image, driven by the injectable `resolveImage` option.
 *
 *  - When the resolver returns an attachment `id`, we emit the "library" shape:
 *    a `wp:image` comment carrying id (+ sizeSlug + linkDestination), a
 *    `size-<slug>` figure class, and a `wp-image-<id>` class on the <img>.
 *  - Otherwise we emit the "external" fallback: a bare figure/img with no id.
 *
 * An optional caption renders as a `<figcaption class="wp-element-caption">`
 * (current core shape; version-sensitive — the harness polices it).
 */
export function renderImage(node: Image, ctx: RenderContext): string {
  const alt = node.alt ?? "";
  const resolved = ctx.options.resolveImage?.(
    node.url,
    alt,
    node.title ?? undefined,
  );

  return resolved != null && resolved.id != null
    ? renderLibraryImage(resolved, alt)
    : renderExternalImage(resolved, node.url, alt);
}

function renderLibraryImage(resolved: ResolvedImage, fallbackAlt: string): string {
  const id = resolved.id as number;
  const altText = resolved.alt ?? fallbackAlt;
  const sizeSlug = resolved.sizeSlug;

  const attrs: Record<string, unknown> = { id };
  if (sizeSlug != null) {
    attrs.sizeSlug = sizeSlug;
  }
  attrs.linkDestination = "none";

  const figureClass =
    sizeSlug != null
      ? `wp-block-image size-${sizeSlug}`
      : "wp-block-image";

  const img =
    `<img src="${escapeAttribute(resolved.url)}"` +
    ` alt="${escapeAttribute(altText)}"` +
    ` class="wp-image-${id}"/>`;

  const caption = renderCaption(resolved.caption);
  const inner = `<figure class="${figureClass}">${img}${caption}</figure>`;
  return `<!-- wp:image ${JSON.stringify(attrs)} -->\n${inner}\n<!-- /wp:image -->`;
}

function renderExternalImage(
  resolved: ResolvedImage | undefined,
  fallbackUrl: string,
  fallbackAlt: string,
): string {
  const url = resolved?.url ?? fallbackUrl;
  const altText = resolved?.alt ?? fallbackAlt;
  const img = `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(altText)}"/>`;
  const caption = renderCaption(resolved?.caption);
  const inner = `<figure class="wp-block-image">${img}${caption}</figure>`;
  return `<!-- wp:image -->\n${inner}\n<!-- /wp:image -->`;
}

function renderCaption(caption: string | undefined): string {
  if (caption == null || caption === "") {
    return "";
  }
  return `<figcaption class="wp-element-caption">${escapeText(caption)}</figcaption>`;
}

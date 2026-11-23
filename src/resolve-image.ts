import type { Image } from "mdast";
import type { ResolvedImage, ResolvedOptions } from "./types.js";
import { isSafeImageUrl } from "./url.js";

/** Run `resolveImage` and merge with the Markdown's url and alt; null when the URL fails the policy. */
export function resolveMarkdownImage(
  node: Image,
  options: ResolvedOptions,
): ResolvedImage | null {
  const alt = node.alt ?? "";
  const resolved = options.resolveImage?.(node.url, alt, node.title ?? undefined);
  const id = resolved?.id;
  if (id != null && !(Number.isSafeInteger(id) && id > 0)) {
    throw new RangeError(
      `resolveImage returned an invalid id for ${JSON.stringify(node.url)}: ` +
        `expected a positive integer, got ${JSON.stringify(id)}`,
    );
  }

  const image: ResolvedImage = {
    ...resolved,
    url: resolved?.url ?? node.url,
    alt: resolved?.alt ?? alt,
  };
  const allowed = options.urlSchemes === "any" || isSafeImageUrl(image.url);
  return allowed ? image : null;
}

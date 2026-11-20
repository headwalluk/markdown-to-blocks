import type { Image } from "mdast";
import type { ResolvedImage, ResolvedOptions } from "./types.js";
import { isSafeImageUrl } from "./url.js";

/**
 * Run the `resolveImage` callback for an mdast image and merge the result with
 * the Markdown's own url/alt. Returns null when the final url fails the
 * `urlSchemes` policy, so the caller drops the image. Throws a RangeError when
 * the resolver returns an `id` that isn't a positive safe integer.
 */
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

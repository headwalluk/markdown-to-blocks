/**
 * Heading-anchor slugs (GitHub-style).
 *
 * `slugify` lowercases, drops anything that isn't a letter, number, underscore,
 * space or hyphen, then turns spaces into hyphens. Runs of spaces/hyphens are
 * NOT collapsed, so `Foo & Bar` → `foo--bar` (the `&` is removed and the two
 * surrounding spaces each become a hyphen) — matching GitHub's rendering.
 *
 * `createHeadingSlugger` layers GitHub's de-duplication on top: a repeated slug
 * gets a `-1`, `-2`, … suffix so every heading in one document is unique and
 * page anchors never collide.
 */

export interface HeadingSlugger {
  /**
   * Return a unique, GitHub-style slug for `text`. Returns "" when `text` slugs
   * to nothing (e.g. it was only punctuation/emoji) so the caller can omit the
   * anchor entirely rather than emit an empty `id`.
   */
  slug(text: string): string;
}

/** Lowercase, strip punctuation, spaces → hyphens. No de-duplication. */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_ -]+/gu, "")
    .replace(/ /g, "-");
  return slug;
}

/** A per-document slugger that appends `-1`, `-2`, … to duplicate slugs. */
export function createHeadingSlugger(): HeadingSlugger {
  // slug → number of times it has been handed out as a base.
  const occurrences = new Map<string, number>();
  return {
    slug(text: string): string {
      const base = slugify(text);
      let result = base;
      if (base !== "") {
        while (occurrences.has(result)) {
          const next = (occurrences.get(base) ?? 0) + 1;
          occurrences.set(base, next);
          result = `${base}-${next}`;
        }
        occurrences.set(result, 0);
      }
      return result;
    },
  };
}

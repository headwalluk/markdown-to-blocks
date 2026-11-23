/** GitHub-style heading-anchor slugs (docs/block-markup.md#heading). */

/** Hands out unique slugs within one document. */
export interface HeadingSlugger {
  /** A unique slug for `text`, or "" when it slugs to nothing (the caller then omits the anchor). */
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

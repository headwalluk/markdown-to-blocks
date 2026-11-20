import type { PhrasingContent, RootContent } from "mdast";
import type { HeadingSlugger } from "./slug.js";

/** A WordPress image resolved from a Markdown image reference. */
export interface ResolvedImage {
  url: string;
  alt?: string;
  /** WordPress attachment ID → enables wp-image-{id} + size class. */
  id?: number;
  /** e.g. 'large', 'full'; only used when id is present. */
  sizeSlug?: string;
  caption?: string;
}

export interface ConvertOptions {
  /**
   * Shift every heading level by this amount. Default 0.
   * Set to 1 for docs whose first section is `#`, so `#`→h2 and body never emits h1.
   */
  headingShift?: number;

  /** Clamp resulting heading levels into [min, 6]; min must be 1–6. Default 2 (avoid body h1). */
  minHeadingLevel?: number;

  /**
   * Derive an `id` (WordPress `anchor` attribute) for every heading from its
   * text, so in-page anchor links work. GitHub-style slugs, de-duplicated per
   * document (`overview`, `overview-1`, …). Default false. A heading that slugs
   * to nothing (only punctuation/emoji) gets no `id`.
   */
  headingAnchors?: boolean;

  /**
   * Resolve a Markdown image to a WordPress image. Return undefined to emit an
   * "external" image block (no attachment id). The agent supplies this after
   * uploading to the media library.
   */
  resolveImage?: (
    src: string,
    alt: string,
    title?: string,
  ) => ResolvedImage | undefined;

  /**
   * 'drop' (default): core behaviour, language is discarded.
   * 'class': add `language-xxx` to the <code> for a Prism/highlight.js plugin.
   */
  codeLanguage?: "drop" | "class";

  /**
   * How to handle unsupported / raw-HTML nodes. 'html' (default): block HTML →
   * core/html, inline HTML verbatim. 'skip': omit both.
   */
  unsupported?: "html" | "skip";

  /**
   * 'safe' (default): links keep their href only for http(s), mailto, tel or
   * relative URLs (otherwise just the link text renders); images need http(s)
   * or relative URLs (otherwise they are dropped). 'any': no scheme check.
   */
  urlSchemes?: "safe" | "any";

  /** Enable GFM (tables, strikethrough, autolinks). Default true. */
  gfm?: boolean;
}

/** Internal: options after defaults have been applied. */
export interface ResolvedOptions {
  headingShift: number;
  minHeadingLevel: number;
  headingAnchors: boolean;
  resolveImage?: ConvertOptions["resolveImage"];
  codeLanguage: "drop" | "class";
  unsupported: "html" | "skip";
  urlSchemes: "safe" | "any";
  gfm: boolean;
}

export interface ParsedDocument {
  frontmatter: Record<string, unknown>;
  blocks: string;
}

/**
 * Threaded through every block renderer. Carries resolved options plus the
 * recursion hooks a renderer needs: inline rendering, and dispatching child
 * block nodes (used by quote, list, etc.). Defined as a type here; the concrete
 * implementation is built in convert.ts.
 */
export interface RenderContext {
  options: ResolvedOptions;
  /** Per-document heading slugger (unique anchor ids). See `headingAnchors`. */
  slugger: HeadingSlugger;
  /** Render inline (phrasing) children to an HTML string. */
  renderInline(nodes: PhrasingContent[]): string;
  /** Dispatch a single block node → markup string, or null if it should be dropped. */
  renderBlock(node: RootContent): string | null;
  /** Dispatch a list of block nodes, dropping any that render to null. */
  renderBlocks(nodes: RootContent[]): string[];
}

const CODE_LANGUAGE_MODES: readonly string[] = ["drop", "class"];
const UNSUPPORTED_MODES: readonly string[] = ["html", "skip"];
const URL_SCHEME_MODES: readonly string[] = ["safe", "any"];

/** Fill in defaults for any option left undefined, without validating. */
export function applyOptionDefaults(options?: ConvertOptions): ResolvedOptions {
  return {
    headingShift: options?.headingShift ?? 0,
    minHeadingLevel: options?.minHeadingLevel ?? 2,
    headingAnchors: options?.headingAnchors ?? false,
    resolveImage: options?.resolveImage,
    codeLanguage: options?.codeLanguage ?? "drop",
    unsupported: options?.unsupported ?? "html",
    urlSchemes: options?.urlSchemes ?? "safe",
    gfm: options?.gfm ?? true,
  };
}

/** Apply defaults to `options`, throwing a RangeError that lists every invalid value. */
export function resolveOptions(options?: ConvertOptions): ResolvedOptions {
  const resolved = applyOptionDefaults(options);
  const problems = validateOptions(resolved);
  if (problems.length > 0) {
    throw new RangeError(`invalid options:\n  ${problems.join("\n  ")}`);
  }
  return resolved;
}

/** Return one message per invalid value in `options`; empty when all are valid. */
export function validateOptions(options: ResolvedOptions): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(options.headingShift)) {
    problems.push(`headingShift must be an integer (got ${String(options.headingShift)})`);
  }
  const minLevel = options.minHeadingLevel;
  if (!Number.isInteger(minLevel) || minLevel < 1 || minLevel > 6) {
    problems.push(`minHeadingLevel must be an integer from 1 to 6 (got ${String(minLevel)})`);
  }
  if (!CODE_LANGUAGE_MODES.includes(options.codeLanguage)) {
    problems.push(`codeLanguage must be 'drop' or 'class' (got ${JSON.stringify(options.codeLanguage)})`);
  }
  if (!UNSUPPORTED_MODES.includes(options.unsupported)) {
    problems.push(`unsupported must be 'html' or 'skip' (got ${JSON.stringify(options.unsupported)})`);
  }
  if (!URL_SCHEME_MODES.includes(options.urlSchemes)) {
    problems.push(`urlSchemes must be 'safe' or 'any' (got ${JSON.stringify(options.urlSchemes)})`);
  }
  return problems;
}

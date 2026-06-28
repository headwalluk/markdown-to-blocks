import type { PhrasingContent, RootContent } from "mdast";

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

  /** Clamp resulting heading levels into [min, 6]. Default min = 2 (avoid body h1). */
  minHeadingLevel?: number;

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

  /** How to handle unsupported / raw-HTML nodes. 'html' (default) → core/html. 'skip' → omit. */
  unsupported?: "html" | "skip";

  /** Enable GFM (tables, strikethrough, autolinks). Default true. */
  gfm?: boolean;
}

/** Internal: options after defaults have been applied. */
export interface ResolvedOptions {
  headingShift: number;
  minHeadingLevel: number;
  resolveImage?: ConvertOptions["resolveImage"];
  codeLanguage: "drop" | "class";
  unsupported: "html" | "skip";
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
  /** Render inline (phrasing) children to an HTML string. */
  renderInline(nodes: PhrasingContent[]): string;
  /** Dispatch a single block node → markup string, or null if it should be dropped. */
  renderBlock(node: RootContent): string | null;
  /** Dispatch a list of block nodes, dropping any that render to null. */
  renderBlocks(nodes: RootContent[]): string[];
}

export function resolveOptions(options?: ConvertOptions): ResolvedOptions {
  return {
    headingShift: options?.headingShift ?? 0,
    minHeadingLevel: options?.minHeadingLevel ?? 2,
    resolveImage: options?.resolveImage,
    codeLanguage: options?.codeLanguage ?? "drop",
    unsupported: options?.unsupported ?? "html",
    gfm: options?.gfm ?? true,
  };
}

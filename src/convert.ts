import type {
  Definition,
  Image,
  ImageReference,
  Link,
  LinkReference,
  Node,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { renderInline } from "./inline.js";
import { createHeadingSlugger } from "./slug.js";
import {
  type ConvertOptions,
  type RenderContext,
  resolveOptions,
  type ResolvedOptions,
} from "./types.js";

import { renderCode } from "./blocks/code.js";
import { renderHtml } from "./blocks/html.js";
import { renderImage } from "./blocks/image.js";
import { renderHeading } from "./blocks/heading.js";
import { renderList } from "./blocks/list.js";
import { renderParagraph } from "./blocks/paragraph.js";
import { renderQuote } from "./blocks/quote.js";
import { renderSeparator } from "./blocks/separator.js";
import { renderTable } from "./blocks/table.js";

/** Deepest mdast nesting accepted; deeper input would overflow the recursive renderers. */
export const MAX_NESTING_DEPTH = 200;

/** Parse Markdown to an mdast tree, throwing a RangeError if it nests too deeply. */
export function parseMarkdown(markdown: string, options: ResolvedOptions): Root {
  const base = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);
  const processor = options.gfm ? base.use(remarkGfm) : base;
  const tree = processor.parse(markdown);
  const root = processor.runSync(tree) as Root;
  const depth = maxDepth(root);
  if (depth > MAX_NESTING_DEPTH) {
    throw new RangeError(
      `Markdown nests ${depth} levels deep; the limit is ${MAX_NESTING_DEPTH}`,
    );
  }
  resolveReferences(root);
  return root;
}

/** Measure the deepest node in the tree, iteratively so deep input can't overflow. */
function maxDepth(root: Root): number {
  let deepest = 0;
  const pending: Array<{ node: Node; depth: number }> = [{ node: root, depth: 0 }];
  let entry = pending.pop();
  while (entry != null) {
    deepest = Math.max(deepest, entry.depth);
    const children = (entry.node as Parent).children ?? [];
    for (const child of children) {
      pending.push({ node: child, depth: entry.depth + 1 });
    }
    entry = pending.pop();
  }
  return deepest;
}

/**
 * Resolve reference-style links/images (`[text][ref]`, `![alt][ref]`) against
 * their `[ref]: url` definitions, rewriting them into plain `link`/`image` nodes
 * in place. This keeps every block/inline renderer simple — they only ever see
 * resolved nodes — and lets the paragraph-only-image → core/image detection work
 * for reference images too. Unresolved references (no matching definition) are
 * left as-is and fall through to best-effort text rendering.
 */
function resolveReferences(tree: Root): void {
  const definitions = new Map<string, Definition>();
  visit(tree, "definition", (node: Definition) => {
    definitions.set(node.identifier, node);
  });

  visit(tree, "linkReference", (node: LinkReference) => {
    const def = definitions.get(node.identifier);
    if (def != null) {
      const link = node as unknown as Link;
      link.type = "link";
      link.url = def.url;
      link.title = def.title ?? null;
    }
  });

  visit(tree, "imageReference", (node: ImageReference) => {
    const def = definitions.get(node.identifier);
    if (def != null) {
      const alt = node.alt ?? "";
      const image = node as unknown as Image;
      image.type = "image";
      image.url = def.url;
      image.title = def.title ?? null;
      image.alt = alt;
    }
  });
}

/** Build the render context whose hooks the block renderers recurse through. */
export function createContext(options: ResolvedOptions): RenderContext {
  const context: RenderContext = {
    options,
    slugger: createHeadingSlugger(),
    renderInline(nodes: PhrasingContent[]): string {
      return renderInline(nodes, options);
    },
    renderBlock(node: RootContent): string | null {
      return dispatch(node, context);
    },
    renderBlocks(nodes: RootContent[]): string[] {
      const out: string[] = [];
      for (const node of nodes) {
        const rendered = dispatch(node, context);
        if (rendered != null) {
          out.push(rendered);
        }
      }
      return out;
    },
  };
  return context;
}

/** Map a single block-level mdast node to its block markup (or null to drop). */
function dispatch(node: RootContent, ctx: RenderContext): string | null {
  let out: string | null = null;
  switch (node.type) {
    case "paragraph":
      out = renderParagraph(node, ctx);
      break;
    case "heading":
      out = renderHeading(node, ctx);
      break;
    case "code":
      out = renderCode(node, ctx);
      break;
    case "list":
      out = renderList(node, ctx);
      break;
    case "blockquote":
      out = renderQuote(node, ctx);
      break;
    case "thematicBreak":
      out = renderSeparator();
      break;
    case "table":
      out = renderTable(node, ctx);
      break;
    case "image":
      out = renderImage(node, ctx);
      break;
    case "html":
      out = renderHtml(node, ctx);
      break;
    case "yaml":
      // Frontmatter: never part of post_content. Dropped here; surfaced via
      // parseMarkdownDocument instead.
      out = null;
      break;
    case "definition":
    case "footnoteDefinition":
      // Link-reference / footnote definitions emit no standalone block.
      out = null;
      break;
    default:
      out = renderUnsupported(node, ctx);
      break;
  }
  return out;
}

/** Fallback for block nodes we don't explicitly handle. */
function renderUnsupported(node: RootContent, ctx: RenderContext): string | null {
  let out: string | null = null;
  if (ctx.options.unsupported === "skip") {
    out = null;
  } else {
    const value = (node as { value?: string }).value;
    if (typeof value === "string" && value !== "") {
      out = `<!-- wp:html -->\n${value}\n<!-- /wp:html -->`;
    }
  }
  return out;
}

/** Convert Markdown to one string per top-level block. */
export function markdownToBlockList(
  markdown: string,
  options?: ConvertOptions,
): string[] {
  const resolved = resolveOptions(options);
  const root = parseMarkdown(markdown, resolved);
  const context = createContext(resolved);
  const blocks = context.renderBlocks(root.children);
  return blocks;
}

/** Convert Markdown to a single serialised block-markup string. */
export function markdownToBlocks(
  markdown: string,
  options?: ConvertOptions,
): string {
  const blocks = markdownToBlockList(markdown, options);
  return blocks.join("\n\n");
}

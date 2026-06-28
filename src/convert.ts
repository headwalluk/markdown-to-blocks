import type { PhrasingContent, Root, RootContent } from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { renderInline } from "./inline.js";
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

/** Parse Markdown to an mdast tree using the configured plugins. */
export function parseMarkdown(markdown: string, options: ResolvedOptions): Root {
  const base = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);
  const processor = options.gfm ? base.use(remarkGfm) : base;
  const tree = processor.parse(markdown);
  const root = processor.runSync(tree) as Root;
  return root;
}

/** Build the render context whose hooks the block renderers recurse through. */
export function createContext(options: ResolvedOptions): RenderContext {
  const context: RenderContext = {
    options,
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

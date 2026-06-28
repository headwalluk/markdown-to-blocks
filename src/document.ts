import type { RootContent, Yaml } from "mdast";
import { parse as parseYaml } from "yaml";
import { createContext, parseMarkdown } from "./convert.js";
import {
  type ConvertOptions,
  type ParsedDocument,
  resolveOptions,
} from "./types.js";

/**
 * Strip YAML frontmatter off the top of a document and convert only the body.
 *
 * The agent uses the returned `frontmatter` to populate REST fields (title,
 * slug, date, …); those must never appear in `post_content`. Only the body is
 * serialised to blocks.
 */
export function parseMarkdownDocument(
  markdown: string,
  options?: ConvertOptions,
): ParsedDocument {
  const resolved = resolveOptions(options);
  const root = parseMarkdown(markdown, resolved);

  let frontmatter: Record<string, unknown> = {};
  const bodyNodes: RootContent[] = [];
  for (const node of root.children) {
    if (node.type === "yaml") {
      frontmatter = parseFrontmatter((node as Yaml).value);
    } else {
      bodyNodes.push(node);
    }
  }

  const context = createContext(resolved);
  const blocks = context.renderBlocks(bodyNodes).join("\n\n");
  return { frontmatter, blocks };
}

/** Parse a YAML frontmatter block, coercing anything non-object to `{}`. */
function parseFrontmatter(value: string): Record<string, unknown> {
  let result: Record<string, unknown> = {};
  const parsed: unknown = parseYaml(value);
  if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
    result = parsed as Record<string, unknown>;
  }
  return result;
}

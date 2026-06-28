import type { Heading } from "mdast";
import type { RenderContext } from "../types.js";

/**
 * Heading → core/heading.
 *
 * Apply `headingShift`, then clamp into [minHeadingLevel, 6]. Level 2 is the
 * block default and omits the `level` attribute; all other levels carry it.
 * The `wp-block-heading` class is current-core (WP 5.9+).
 */
export function renderHeading(node: Heading, ctx: RenderContext): string {
  const { headingShift, minHeadingLevel } = ctx.options;
  const shifted = node.depth + headingShift;
  const level = Math.min(6, Math.max(minHeadingLevel, shifted));
  const inner = ctx.renderInline(node.children);

  const attrs = level === 2 ? "" : ` {"level":${level}}`;
  const open = `<!-- wp:heading${attrs} -->`;
  const tag = `<h${level} class="wp-block-heading">${inner}</h${level}>`;
  const close = "<!-- /wp:heading -->";
  return `${open}\n${tag}\n${close}`;
}

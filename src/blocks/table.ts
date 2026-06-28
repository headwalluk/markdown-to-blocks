import type { Table, TableRow } from "mdast";
import type { RenderContext } from "../types.js";

/**
 * GFM table → core/table, wrapped in a `<figure class="wp-block-table">`.
 * The first row is the header (`<th>`); the rest are body rows (`<td>`). Cell
 * contents go through the inline renderer. Per-column alignment is phase 2.
 */
export function renderTable(node: Table, ctx: RenderContext): string {
  const [headerRow, ...bodyRows] = node.children;

  let html = "";
  if (headerRow != null) {
    html += `<thead>${renderRow(headerRow, "th", ctx)}</thead>`;
  }
  if (bodyRows.length > 0) {
    const rows: string[] = [];
    for (const row of bodyRows) {
      rows.push(renderRow(row, "td", ctx));
    }
    html += `<tbody>${rows.join("")}</tbody>`;
  }

  const inner = `<figure class="wp-block-table"><table>${html}</table></figure>`;
  return `<!-- wp:table -->\n${inner}\n<!-- /wp:table -->`;
}

function renderRow(
  row: TableRow,
  cellTag: "th" | "td",
  ctx: RenderContext,
): string {
  const cells: string[] = [];
  for (const cell of row.children) {
    cells.push(`<${cellTag}>${ctx.renderInline(cell.children)}</${cellTag}>`);
  }
  return `<tr>${cells.join("")}</tr>`;
}

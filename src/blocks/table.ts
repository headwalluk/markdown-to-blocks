import type { Table, TableRow } from "mdast";
import type { RenderContext } from "../types.js";

/** GFM table → core/table: first row as `<thead>`, the rest as `<tbody>`. */
export function renderTable(node: Table, context: RenderContext): string {
  const [headerRow, ...bodyRows] = node.children;

  let html = "";
  if (headerRow != null) {
    html += `<thead>${renderRow(headerRow, "th", context)}</thead>`;
  }
  if (bodyRows.length > 0) {
    const rows: string[] = [];
    for (const row of bodyRows) {
      rows.push(renderRow(row, "td", context));
    }
    html += `<tbody>${rows.join("")}</tbody>`;
  }

  const inner = `<figure class="wp-block-table"><table>${html}</table></figure>`;
  return `<!-- wp:table -->\n${inner}\n<!-- /wp:table -->`;
}

function renderRow(
  row: TableRow,
  cellTag: "th" | "td",
  context: RenderContext,
): string {
  const cells: string[] = [];
  for (const cell of row.children) {
    cells.push(`<${cellTag}>${context.renderInline(cell.children)}</${cellTag}>`);
  }
  return `<tr>${cells.join("")}</tr>`;
}

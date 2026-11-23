# Supported Markdown

For everyone: what each piece of Markdown becomes.

| Markdown | Result |
|---|---|
| Paragraphs | `core/paragraph` |
| Headings `#`–`######` | `core/heading` (shift and clamp applied) |
| Fenced / indented code | `core/code` |
| Unordered / ordered lists, nested | `core/list` + `core/list-item` |
| Blockquotes | `core/quote` (with inner paragraph blocks) |
| Thematic breaks `---` `***` `___` | `core/separator` |
| Tables (GFM) | `core/table` |
| Images, linked images `[![alt](src)](href)` | `core/image` (resolver-driven; title → caption) |
| Raw HTML in source | `core/html` |
| **bold**, *italic*, `code`, ~~strike~~, links, hard breaks | inline HTML |
| Reference-style links and images (`[text][ref]`) | resolved against their definitions |
| GFM task lists | leading `☐` / `☑` glyph (not interactive inputs) |
| YAML frontmatter | dropped from the markup; returned by `parseMarkdownDocument` / `--frontmatter` |

## Headings: avoiding duplicate titles

Docs often open with a single `#` title *and* carry that same title in frontmatter. If you send
the frontmatter `title` to WordPress **and** leave the `#` in the body, the title appears twice.
Pick one:

- **Let frontmatter own the title** and don't repeat it as an in-body heading. Simplest.
- **Keep a `#` title in the body** and convert with `headingShift: 1` (`--heading-shift 1`), so
  the `#` becomes `h2` and your real sections shift down accordingly.

By default `headingShift` is `0` and `minHeadingLevel` is `2`, so a body `#` becomes `h2`
(never `h1`).

## Limitations

- **No syntax highlighting**: core `core/code` has none. Use `codeLanguage: 'class'` plus a
  highlighter plugin if you need it.
- **No per-column table alignment** yet.
- **No interactive task-list checkboxes**: a glyph is rendered instead.
- **No media uploads**: your agent uploads and feeds results via `resolveImage`.
- **No block-theme / Site Editor constructs** (columns, groups, cover, etc.). Core content
  blocks only.
- **Nesting is capped at 200 levels** (quotes, lists and inline formatting combined).

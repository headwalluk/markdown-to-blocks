# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-28

First stable release. Output is validated against WordPress core's own block
parser and confirmed to import into the block editor with no recovery prompts.

### Added

- `markdownToBlocks(markdown, options?)` — convert Markdown to a single
  serialised core-block markup string.
- `markdownToBlockList(markdown, options?)` — convert to one string per
  top-level block.
- `parseMarkdownDocument(markdown, options?)` — strip YAML frontmatter and
  convert only the body, returning `{ frontmatter, blocks }`.
- Block coverage: paragraph, heading, code, list (incl. nesting), quote,
  separator, table (GFM), image, and raw-HTML fallback (`core/html`).
- Inline coverage: bold, italic, inline code, strikethrough, links, hard line
  breaks, and GFM task-list glyphs (`☐` / `☑`).
- `ConvertOptions`: `headingShift`, `minHeadingLevel`, `resolveImage`,
  `codeLanguage`, `unsupported`, `gfm`.
- Resolver-driven images via `resolveImage`, with an external-image fallback
  when no attachment id is supplied.
- `md2blocks` CLI: `-i/--input`, `-o/--output`, bare-filename input, stdin
  (`-`), `--frontmatter` JSON mode, and conversion flags
  (`--heading-shift`, `--min-heading-level`, `--code-language`,
  `--unsupported`, `--no-gfm`).
- WordPress validation harness (`@wordpress/blocks` + `@wordpress/block-library`
  under jsdom, dev-only) asserting every fixture's output is `isValid`.

### Notes

- ESM-only. Requires Node ≥ 18.
- Zero runtime dependencies — all bundled into the published package.

[Unreleased]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/headwalluk/markdown-to-blocks/releases/tag/v1.0.0

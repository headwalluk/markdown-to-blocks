# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-11-20

### Security

- **Link and image URLs are now restricted to safe schemes by default**
  (`urlSchemes: 'safe'`). Links keep their `href` only for `http:`, `https:`,
  `mailto:`, `tel:` and relative URLs, otherwise only the link text renders.
  Images need `http:`, `https:` or a relative URL, otherwise they are dropped.
  This covers inline, reference-style and resolver-supplied URLs, and reads
  schemes as a browser does (case, embedded tabs/newlines, leading
  whitespace). `urlSchemes: 'any'` / `--url-schemes any` restores the old
  pass-through.
- `unsupported: 'skip'` now drops inline HTML too. Previously only block HTML
  was dropped, so inline markup, including a `<!-- wp:… -->` comment that
  injects a block, survived in skip mode.
- Fenced code blocks now apply core/code's own save-time escaping: `[` becomes
  `&#91;` and the first URL alone on its line has its `//` escaped. Shortcodes
  in code examples previously ran on the front end, and the output didn't match
  what the block editor saves.
- `resolveImage` must return a positive integer `id`; anything else throws a
  `RangeError`. A malformed id could previously break out of the image's
  `class` attribute.
- Markdown nesting deeper than 200 levels throws a `RangeError` naming the
  depth, instead of overflowing the call stack (about 3,000 nested `>` was
  enough).

### Fixed

- Ordered lists that don't start at 1 (`3. Three`) kept their numbering in
  Markdown but were renumbered from 1 in WordPress. They now carry `start` in
  the block attributes and on the `<ol>`, matching core's serialiser.
- With `codeLanguage: 'class'`, the fence language was written into the `class`
  attribute unescaped, so a language containing `"` broke out of the attribute
  and produced an invalid block. It is now attribute-escaped.
- A resolver-supplied `sizeSlug` is now escaped in both the `wp:image`
  attributes (as core's serialiser does, so `-->` can't close the comment) and
  the figure's `size-…` class.
- Invalid options no longer produce invalid markup (`<hNaN>`, `<h0>`). All
  conversion functions now throw a `RangeError` listing every invalid option:
  `headingShift` must be an integer, `minHeadingLevel` an integer from 1 to 6,
  and `codeLanguage` / `unsupported` one of their documented modes. Unknown
  mode strings were previously treated as the default.
- The CLI no longer silently ignores unknown options, flags missing their
  value, non-integer numbers or extra file arguments. It reports every problem
  together and exits 1 without converting.

### Changed

- Output is now validated against `@wordpress/block-library` 12 and
  `@wordpress/blocks` 17 (dev-only). Dev tooling refreshed: tsup 9, jsdom 31,
  vitest 5.1. Bundled runtime code is unchanged, and the built JavaScript is
  byte-identical between tsup 8 and 9. Clears a dev-only `undici` advisory
  (via jsdom).

## [1.3.0] - 2026-10-06

### Fixed

- CLI output written to a pipe (`md2blocks -i post.md | …`, `$(md2blocks …)`,
  `child_process`) was silently cut off at 64 KB with exit code 0, because the
  CLI called `process.exit()` before stdout had drained. Output to a file or
  via `-o` was unaffected. The CLI now sets `process.exitCode` and lets stdout
  drain.

### Changed

- **Require Node ≥ 22** (was ≥ 20). Node 20 is end-of-life; CI now tests
  Node 22 and 24, and the build targets `node22`.
- When the reader closes the pipe early (`md2blocks … | head`), the CLI exits
  quietly with code 141, as a SIGPIPE-killed process would, so `set -o pipefail`
  scripts can detect the incomplete output.
- Bundled `yaml` updated to 2.9.1. Output is now validated against
  `@wordpress/block-library` 11 and `@wordpress/blocks` 16 (dev-only).

## [1.2.0] - 2026-07-05

### Added

- `headingAnchors` option (CLI `--heading-anchors`): derive an `id` (WordPress
  `anchor` attribute) for each heading from its text, so in-page anchor links
  work. GitHub-style slugs, de-duplicated per document (`overview`,
  `overview-1`, …); a heading that slugs to nothing (only punctuation/emoji)
  gets no `id`. Off by default. Output matches core's serialiser byte-for-byte
  (including `--` attribute escaping) and validates against the
  WordPress parser.

## [1.1.1] - 2026-06-29

### Fixed

- Reference-style links (`[text][ref]`) and images (`![alt][ref]`) are now
  resolved against their `[ref]: url` definitions instead of being silently
  dropped (links lost their URL; images vanished entirely).

### Changed

- CLI: exit with a clear "no input" message and usage hint instead of hanging
  when run on an interactive terminal with no file argument and nothing piped to
  stdin.

## [1.1.0] - 2026-06-28

### Changed

- **Require Node ≥ 20** (was ≥ 18). Node 18 is end-of-life; CI no longer tests
  against it.

### Added

- GitHub Actions CI: `typecheck` + `build` + `test` across Node 20, 22, and 24
  on every push and pull request to `main`.

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

[Unreleased]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/headwalluk/markdown-to-blocks/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/headwalluk/markdown-to-blocks/releases/tag/v1.0.0

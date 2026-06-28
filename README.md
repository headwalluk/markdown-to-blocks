# markdown-to-blocks

> Convert Markdown into serialised WordPress/Gutenberg **block markup** — HTML with `<!-- wp:… -->` delimiters that drops straight into the block editor with no "Convert to blocks" or "this block contains unexpected content" prompts.

[![CI](https://github.com/headwalluk/markdown-to-blocks/actions/workflows/ci.yml/badge.svg)](https://github.com/headwalluk/markdown-to-blocks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@headwall/markdown-to-blocks.svg)](https://www.npmjs.com/package/@headwall/markdown-to-blocks)
[![npm downloads](https://img.shields.io/npm/dm/@headwall/markdown-to-blocks.svg)](https://www.npmjs.com/package/@headwall/markdown-to-blocks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/@headwall/markdown-to-blocks.svg)](https://nodejs.org)
[![Types](https://img.shields.io/npm/types/@headwall/markdown-to-blocks.svg)](https://www.typescriptlang.org/)

`markdown-to-blocks` turns a Markdown string into **core-block** markup that WordPress parses into discrete native blocks. It was built so an AI agent (or any script) can read Markdown and `POST` reliable Gutenberg content to WordPress via the REST API — no browser, no `@wordpress/*` runtime dependency, no DOM.

- **Validated against core.** Every supported block is checked against WordPress's own block parser in the test suite, so the output validates first time.
- **Pure & deterministic.** The converter touches no network, filesystem, or global state. Same input → same output. All I/O lives in the CLI.
- **Zero runtime dependencies.** Everything is bundled into the published package.
- **Library + CLI.** Import it, or shell out to `md2blocks`.

---

## Installation

### As a CLI (global)

```bash
npm install -g @headwall/markdown-to-blocks
```

This puts the `md2blocks` command on your `PATH`. Requires **Node ≥ 20**.

### As a library

```bash
npm install @headwall/markdown-to-blocks
```

---

## Quick start

### Command line

```bash
# Convert a file to block markup
md2blocks -i BLOG-POST.md -o blog-post.html

# Or write to stdout and redirect
md2blocks -i BLOG-POST.md > blog-post.html

# Or pipe via stdin
cat BLOG-POST.md | md2blocks - > blog-post.html
```

### Library

```ts
import { markdownToBlocks } from "@headwall/markdown-to-blocks";

const html = markdownToBlocks("# Hello\n\nThis is **bold**.");
// <!-- wp:heading -->
// <h2 class="wp-block-heading">Hello</h2>
// <!-- /wp:heading -->
//
// <!-- wp:paragraph -->
// <p>This is <strong>bold</strong>.</p>
// <!-- /wp:paragraph -->
```

---

## Posting to WordPress

The converter produces the `content` field; your script owns the REST call. A minimal example using the REST API with an [application password](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) and [`jq`](https://jqlang.github.io/jq/):

```bash
# Pull title/slug from frontmatter and the body as blocks in one shot
DOC=$(md2blocks -i post.md --frontmatter)
TITLE=$(printf '%s' "$DOC" | jq -r '.frontmatter.title')
CONTENT=$(printf '%s' "$DOC" | jq -r '.blocks')

curl -s -X POST "https://example.com/wp-json/wp/v2/posts" \
  -u "USERNAME:APPLICATION_PASSWORD" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg t "$TITLE" --arg c "$CONTENT" \
        '{title: $t, status: "draft", content: $c}')"
```

---

## CLI reference

```
md2blocks [options]

Input/output:
  -i, --input <file>        Input Markdown file (use "-" or omit for stdin)
  -o, --output <file>       Output file (default: stdout)
  md2blocks <file.md>       A bare filename is treated as --input

Modes:
  --frontmatter             Emit JSON { frontmatter, blocks } instead of markup

Conversion options:
  --heading-shift <n>       Shift all heading levels by n (default 0)
  --min-heading-level <n>   Clamp heading levels to [n, 6] (default 2)
  --code-language <mode>    'drop' (default) or 'class' (emit language-xxx)
  --unsupported <mode>      'html' (default, wrap in core/html) or 'skip'
  --no-gfm                  Disable GFM (tables, strikethrough, autolinks)

  -h, --help                Show help
  -v, --version             Show version
```

Examples:

```bash
# Docs that open with a single "#" title — shift so "#" → h2, never body h1
md2blocks -i README.md --heading-shift 1 -o readme.html

# Keep code-fence languages as language-xxx classes for a highlighter plugin
md2blocks -i snippet.md --code-language class
```

---

## Library API

All functions are pure and synchronous.

### `markdownToBlocks(markdown, options?) → string`

Convert Markdown to a single serialised block-markup string (blocks joined by a blank line, matching WordPress's own spacing).

### `markdownToBlockList(markdown, options?) → string[]`

Same conversion, but returns one string per top-level block — handy if you want to compose or post blocks individually.

### `parseMarkdownDocument(markdown, options?) → { frontmatter, blocks }`

Strip YAML frontmatter off the top of the document and convert only the body. Use the returned `frontmatter` to populate REST fields (title, slug, date…); those must never appear in `post_content`.

```ts
import { parseMarkdownDocument } from "@headwall/markdown-to-blocks";

const { frontmatter, blocks } = parseMarkdownDocument(`---
title: Hello World
slug: hello-world
---

# Intro

Body text.
`);

// frontmatter → { title: "Hello World", slug: "hello-world" }
// blocks      → "<!-- wp:heading -->\n<h2 …>Intro</h2>\n…"
```

### `ConvertOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `headingShift` | `number` | `0` | Shift every heading level by this amount before clamping. |
| `minHeadingLevel` | `number` | `2` | Clamp resulting heading levels into `[min, 6]`. The default of `2` keeps body content from emitting an `h1`. |
| `resolveImage` | `(src, alt, title?) => ResolvedImage \| undefined` | — | Resolve a Markdown image to a WordPress image (see [Images](#images)). |
| `codeLanguage` | `'drop' \| 'class'` | `'drop'` | `'drop'` discards the fence language (core behaviour). `'class'` emits `<code class="language-xxx">` for a syntax-highlighting plugin. |
| `unsupported` | `'html' \| 'skip'` | `'html'` | How to handle raw/unsupported nodes: wrap in `core/html`, or omit. |
| `gfm` | `boolean` | `true` | Enable GFM (tables, strikethrough, autolinks). |

### `ResolvedImage`

```ts
interface ResolvedImage {
  url: string;
  alt?: string;
  id?: number;       // WordPress attachment ID → enables wp-image-{id} + size class
  sizeSlug?: string; // e.g. 'large', 'full'; only used when id is present
  caption?: string;
}
```

---

## Images

The converter never touches the network, so it can't upload media. Instead, your agent uploads each image to the media library (REST `wp/v2/media`) and supplies a `resolveImage` callback:

```ts
import { markdownToBlocks } from "@headwall/markdown-to-blocks";

const html = markdownToBlocks(markdown, {
  resolveImage(src, alt) {
    const media = mediaMap.get(src); // your upload bookkeeping
    if (!media) return undefined;    // → external <img> fallback
    return { url: media.url, id: media.id, sizeSlug: "large", alt };
  },
});
```

- When `resolveImage` returns an object **with an `id`**, you get the attachment shape: `wp:image {"id":…,"sizeSlug":…,"linkDestination":"none"}`, a `size-<slug>` figure class, and a `wp-image-<id>` class on the `<img>`.
- When it returns `undefined`, you get the **external** fallback: a plain `<figure class="wp-block-image">` / `<img>` with no attachment id.

---

## Heading policy (avoid duplicate titles)

Docs often open with a single `#` title *and* carry that same title in frontmatter. If you send the frontmatter `title` to WordPress **and** leave the `#` in the body, the title appears twice. Pick one:

- **Let frontmatter own the title** and don't repeat it as an in-body heading. Simplest.
- **Keep a `#` title in the body** and convert with `headingShift: 1` (`--heading-shift 1`), so the `#` becomes `h2` and your real sections shift down accordingly.

By default `headingShift` is `0` and `minHeadingLevel` is `2`, so a body `#` becomes `h2` (never `h1`).

---

## Supported Markdown

| Markdown | Result |
|---|---|
| Paragraphs | `core/paragraph` |
| Headings `#`–`######` | `core/heading` (shift + clamp applied) |
| Fenced / indented code | `core/code` |
| Unordered / ordered lists, nested | `core/list` + `core/list-item` |
| Blockquotes | `core/quote` (with inner paragraph blocks) |
| Thematic breaks `---` `***` `___` | `core/separator` |
| Tables (GFM) | `core/table` |
| Images | `core/image` (resolver-driven) |
| Raw HTML in source | `core/html` |
| **bold**, *italic*, `code`, ~~strike~~, links, hard breaks | inline HTML |
| GFM task lists | leading `☐` / `☑` glyph (not interactive inputs) |

### Limitations

- **No syntax highlighting** — core `core/code` has none. Use `codeLanguage: 'class'` plus a highlighter plugin if you need it.
- **No per-column table alignment** yet.
- **No interactive task-list checkboxes** — a glyph is rendered instead.
- **No media uploads** — your agent uploads and feeds results via `resolveImage`.
- **No block-theme / Site Editor constructs** (columns, groups, cover, etc.). Core content blocks only.

---

## How validation works

WordPress marks a block "invalid" when the saved markup doesn't match what the block's `save()` function would produce — that's what triggers the editor's recovery prompts. This library's test suite parses every fixture's output through WordPress's own parser (`@wordpress/blocks` + `@wordpress/block-library`, a dev-only dependency) and asserts every block reports `isValid` with zero validation issues. So "validates first time" is verified empirically, not by eye.

---

## Development

```bash
npm install
npm run build      # tsup → dist/ (ESM + .d.ts), deps bundled in
npm test           # vitest: unit + golden fixtures + WP validation harness
npm run typecheck  # tsc --noEmit
```

---

## License

[MIT](./LICENSE) © Paul Faulkner

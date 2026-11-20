# markdown-to-blocks

> Convert Markdown into serialised WordPress/Gutenberg **block markup** — HTML with `<!-- wp:… -->` delimiters that drops straight into the block editor with no "Convert to blocks" or "this block contains unexpected content" prompts.

[![CI](https://github.com/headwalluk/markdown-to-blocks/actions/workflows/ci.yml/badge.svg)](https://github.com/headwalluk/markdown-to-blocks/actions/workflows/ci.yml)
[![version](https://img.shields.io/github/package-json/v/headwalluk/markdown-to-blocks?label=version)](https://www.npmjs.com/package/@headwall/markdown-to-blocks)
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

This puts the `md2blocks` command on your `PATH`. Requires **Node ≥ 22**.

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
  --min-heading-level <n>   Clamp heading levels to [n, 6], n from 1 to 6 (default 2)
  --heading-anchors         Add an id/anchor to each heading from its text
  --code-language <mode>    'drop' (default) or 'class' (emit language-xxx)
  --unsupported <mode>      'html' (default, wrap in core/html) or 'skip' (drop block and inline HTML)
  --url-schemes <mode>      'safe' (default: http(s)/mailto/tel/relative) or 'any'
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
| `headingAnchors` | `boolean` | `false` | Derive an `id` (WordPress `anchor` attribute) for each heading from its text, so in-page anchor links work. GitHub-style slugs, de-duplicated per document (`overview`, `overview-1`, …). A heading that slugs to nothing (only punctuation/emoji) gets no `id`. |
| `resolveImage` | `(src, alt, title?) => ResolvedImage \| undefined` | — | Resolve a Markdown image to a WordPress image (see [Images](#images)). |
| `codeLanguage` | `'drop' \| 'class'` | `'drop'` | `'drop'` discards the fence language (core behaviour). `'class'` emits `<code class="language-xxx">` for a syntax-highlighting plugin. |
| `unsupported` | `'html' \| 'skip'` | `'html'` | How to handle raw HTML and unsupported nodes. `'html'`: block HTML goes into `core/html` and inline HTML passes through verbatim. `'skip'`: both are omitted. |
| `urlSchemes` | `'safe' \| 'any'` | `'safe'` | Restrict link and image URLs to safe schemes (see [URL safety](#url-safety)). `'any'` turns the check off. |
| `gfm` | `boolean` | `true` | Enable GFM (tables, strikethrough, autolinks). |

Invalid option values (a non-integer `headingShift`, a `minHeadingLevel` outside 1–6, an unknown mode string) throw a `RangeError` listing every problem.

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
- An `id` must be a positive integer; anything else throws a `RangeError`.
- The final URL, whether from the Markdown or the resolver, is subject to the [URL safety](#url-safety) policy.

### Captions and links

An image's Markdown title becomes its caption, unless the resolver supplies a `caption`:

```markdown
![Floor plan](https://example.com/wp-content/uploads/plan.png "Ground floor, as built")
```

An image wrapped in a link, alone in its paragraph, becomes a linked `core/image`:

```markdown
[![Floor plan](https://example.com/wp-content/uploads/plan-1024x768.png)](https://example.com/wp-content/uploads/plan.png)
```

- When the link points at the image's own file, `linkDestination` is `"media"`: clicking opens the full-size image, which is what lightbox plugins and themes look for. Any size WordPress generated counts as the same file (`-1024x768`, `-scaled`), as does a relative URL with the same path.
- Any other link is `"custom"`.
- A link whose URL fails the [URL safety](#url-safety) policy is dropped, and the image renders unlinked.
- A linked image inside a sentence stays inline in its paragraph, as before.

---

## Untrusted Markdown

The converter escapes text correctly, but it is **not an HTML sanitiser**. When the Markdown comes from somewhere you don't control (user input, scraped pages, another model's output):

- **Raw HTML passes through by default.** Use `unsupported: 'skip'` to drop both block and inline HTML. WordPress strips unsafe HTML on save only for accounts without the `unfiltered_html` capability, so don't rely on that when posting as an administrator.
- **Shortcodes in prose still run.** `[gallery]` in a paragraph is rendered by WordPress as a shortcode, exactly as if typed in the editor. Inside fenced code blocks `[` is escaped as `&#91;`, matching what the block editor itself saves, so code examples display literally. Inline code is not escaped: the editor would undo it on the next edit.
- **Size is the caller's to bound.** Nesting deeper than 200 levels throws a `RangeError`; overall input size is not limited, so cap it before converting if the source is untrusted.

### URL safety

By default (`urlSchemes: 'safe'`):

- **Links** keep their `href` only for `http:`, `https:`, `mailto:`, `tel:` and relative URLs (`/about`, `#top`). Any other scheme (`javascript:`, `data:`, `vbscript:`, …) renders as the link text alone.
- **Images** need an `http:`, `https:` or relative URL; any other image is dropped.

The scheme is read the way a browser reads it, so `JAVASCRIPT:`, `java&#9;script:` and leading whitespace are all caught. Pass `urlSchemes: 'any'` (`--url-schemes any`) to turn the check off.

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
| Images, linked images `[![alt](src)](href)` | `core/image` (resolver-driven; title → caption) |
| Raw HTML in source | `core/html` |
| **bold**, *italic*, `code`, ~~strike~~, links, hard breaks | inline HTML |
| GFM task lists | leading `☐` / `☑` glyph (not interactive inputs) |

### Limitations

- **No syntax highlighting** — core `core/code` has none. Use `codeLanguage: 'class'` plus a highlighter plugin if you need it.
- **No per-column table alignment** yet.
- **No interactive task-list checkboxes** — a glyph is rendered instead.
- **No media uploads** — your agent uploads and feeds results via `resolveImage`.
- **No block-theme / Site Editor constructs** (columns, groups, cover, etc.). Core content blocks only.
- **Nesting is capped at 200 levels** (quotes, lists and inline formatting combined).

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

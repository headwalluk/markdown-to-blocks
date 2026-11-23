# Library API

For developers calling the converter from JavaScript or TypeScript. Install with
`npm install @headwall/markdown-to-blocks`. The package is ESM only and ships its own types.

All functions are pure and synchronous: no network, filesystem or global state, and the same
input always gives the same output.

## `markdownToBlocks(markdown, options?) → string`

Convert Markdown to a single serialised block-markup string (blocks joined by a blank line,
matching WordPress's own spacing).

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

## `markdownToBlockList(markdown, options?) → string[]`

The same conversion, returning one string per top-level block, for composing or posting blocks
individually.

## `parseMarkdownDocument(markdown, options?) → { frontmatter, blocks }`

Strip YAML frontmatter off the top of the document and convert only the body. Use the returned
`frontmatter` to populate REST fields (title, slug, date…); those must never appear in
`post_content`. Frontmatter that isn't a YAML mapping comes back as `{}`.

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

## `ConvertOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `headingShift` | `number` | `0` | Shift every heading level by this amount before clamping. |
| `minHeadingLevel` | `number` | `2` | Clamp resulting heading levels into `[min, 6]`. The default of `2` keeps body content from emitting an `h1`. |
| `headingAnchors` | `boolean` | `false` | Derive an `id` (WordPress `anchor` attribute) for each heading from its text, so in-page anchor links work. GitHub-style slugs, de-duplicated per document (`overview`, `overview-1`, …). A heading that slugs to nothing (only punctuation or emoji) gets no `id`. |
| `resolveImage` | `(src, alt, title?) => ResolvedImage \| undefined` | — | Resolve a Markdown image to a WordPress image (see [images.md](images.md)). |
| `codeLanguage` | `'drop' \| 'class'` | `'drop'` | `'drop'` discards the fence language (core behaviour). `'class'` emits `<code class="language-xxx">` for a syntax-highlighting plugin. |
| `unsupported` | `'html' \| 'skip'` | `'html'` | How to handle raw HTML and unsupported nodes. `'html'`: block HTML goes into `core/html` and inline HTML passes through verbatim. `'skip'`: both are omitted. |
| `urlSchemes` | `'safe' \| 'any'` | `'safe'` | Restrict link and image URLs to safe schemes (see [security.md](security.md#url-safety)). `'any'` turns the check off. |
| `gfm` | `boolean` | `true` | Enable GFM (tables, strikethrough, autolinks). |

Invalid option values (a non-integer `headingShift`, a `minHeadingLevel` outside 1–6, an unknown
mode string) throw a `RangeError` listing every problem.

## `ResolvedImage`

```ts
interface ResolvedImage {
  url: string;
  alt?: string;
  id?: number;       // WordPress attachment ID → enables wp-image-{id} + size class
  sizeSlug?: string; // e.g. 'large', 'full'; only used when id is present
  caption?: string;
}
```

## Errors

- `RangeError` for invalid options, for a resolver `id` that isn't a positive integer, and for
  Markdown nested more than 200 levels deep.
- Anything thrown by your `resolveImage` callback propagates unchanged.

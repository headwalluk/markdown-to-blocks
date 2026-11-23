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

## Installation

```bash
npm install -g @headwall/markdown-to-blocks   # the md2blocks command
npm install @headwall/markdown-to-blocks      # the library
```

Requires **Node ≥ 22**.

## Quick start

```bash
md2blocks -i BLOG-POST.md -o blog-post.html
cat BLOG-POST.md | md2blocks - > blog-post.html
```

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

## Documentation

Using it:

- [Command line](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/cli.md): `md2blocks` options, examples and exit codes
- [Posting to WordPress](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/posting-to-wordpress.md): sending the output through the REST API
- [Supported Markdown](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/supported-markdown.md): what each piece of Markdown becomes, and the limitations
- [Untrusted Markdown](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/security.md): raw HTML, shortcodes, size limits and URL safety

Calling it from code:

- [Library API](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/library-api.md): the three functions, `ConvertOptions` and `ResolvedImage`
- [Images](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/images.md): the `resolveImage` callback, captions and linked images

Working on it:

- [Development](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/development.md): setup, commands, architecture and tests
- [Block markup reference](https://github.com/headwalluk/markdown-to-blocks/blob/main/docs/block-markup.md): the exact markup each renderer emits, and why
- [Changelog](https://github.com/headwalluk/markdown-to-blocks/blob/main/CHANGELOG.md)

## License

MIT. See [LICENSE](./LICENSE).

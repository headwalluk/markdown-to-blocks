# CLAUDE.md

Guidance for working in this repository.

## What this is

`@headwall/markdown-to-blocks` converts Markdown into serialised
WordPress/Gutenberg **core-block** markup (HTML with `<!-- wp:… -->`
delimiters) that imports into the block editor with no "Convert to blocks" /
"unexpected content" recovery prompts. Primary consumer: an AI agent (or any
script) that reads Markdown and POSTs it to WordPress via the REST API.

## Architecture

```
markdown string
  │  remark-parse (+ remark-gfm, + remark-frontmatter)
  ▼
mdast tree
  │  walk top-level children → dispatch each node to its block renderer
  ▼
string[]  ──join("\n\n")──▶  block markup string
```

- `src/convert.ts` — orchestration: parse, build the `RenderContext`, dispatch
  switch (node type → renderer), join with blank lines.
- `src/blocks/<name>.ts` — **one block renderer per module**. The node-type →
  block mapping is the one obvious `switch` in `convert.ts`.
- `src/inline.ts` — inline (phrasing) renderer; returns inner HTML.
- `src/escape.ts` — escaping helpers.
- `src/document.ts` — `parseMarkdownDocument` (frontmatter via `yaml`).
- `src/cli.ts` — the `md2blocks` CLI. **All `fs`/`stdout` lives here.**

## Hard rules

- **Purity.** The converter does no network, filesystem, or global-state access,
  and is deterministic (same input → same output). Only `src/cli.ts` touches
  I/O. Images are resolved via an injected `resolveImage` callback, never by the
  library itself.
- **Block markup whitespace is load-bearing.** The exact spacing/newlines in the
  emitted markup match WordPress's own serialiser, which is the known-good shape
  (e.g. nested lists: the first `<!-- wp:list-item -->` sits on the same line as
  `<ul class="wp-block-list">`; the final `<!-- /wp:list-item -->` attaches
  directly to `</ul>`). Don't "tidy" it.
- **Escaping discipline.** Escape `& < >` exactly once, straight from the raw
  mdast `value` of text/inlineCode/code nodes. Formatting nodes emit tags
  directly and must not be re-escaped (double-encoding like `&amp;lt;` is a bug).
  Do not escape quotes in visible/code text; attribute values (`href`/`src`) do
  escape `&` and `"` for safety.

## Code style

- **Single Entry, Single Exit (SESE).** Prefer one `return` at the end of a
  function. Build a local accumulator (a string or `string[]`), append in the
  loop, and return after it. **Never `return` from inside a loop.**
- **Guard clauses at the top of a function are fine** (e.g. bail early when a
  node has no children, or to drop an empty paragraph). The SESE rule is about
  not escaping mid-loop, not about banning early guards.
- Keep renderers small and single-purpose; match the surrounding code's naming,
  comment density, and idiom.
- TypeScript is strict (see `tsconfig.json`, incl. `noUncheckedIndexedAccess`,
  `noUnusedLocals/Parameters`). Keep `npm run typecheck` clean — it covers
  `test/` too.

## Testing

Two layers, both run by `npm test` (vitest):

1. **Golden fixtures** — `test/fixtures/*.md` paired with `*.expected.html`.
   `markdownToBlocks(md)` must equal the expected markup byte-for-byte. Add a
   fixture pair for any new block behaviour.
2. **WordPress validation harness** — `test/validate.test.ts` parses every
   fixture's output through WordPress's own parser (`@wordpress/blocks` +
   `@wordpress/block-library`, dev-only, under jsdom) and asserts every block is
   `isValid` with zero issues. This is the empirical check on every
   version-sensitive class/attribute; if core changes one, this test tells you.

`@wordpress/*` packages are inlined by vitest (`server.deps.inline` in
`vitest.config.ts`) because their ESM builds use bare JSON imports Node rejects.

## Build, deps, release

- **Build:** `tsup` → `dist/` (ESM only, `.d.ts`, sourcemaps). Node ≥ 20.
- **Zero runtime dependencies.** All deps (remark/unified/gfm/frontmatter/yaml)
  are `devDependencies` and bundled into `dist/` via `noExternal`. The published
  package has `dependencies: {}`. Keep it that way.
- **`bin` path:** `package.json` `bin` must be `dist/cli.js` **without** a
  leading `./` — npm's publish normalizer strips `./` and can drop the bin
  entirely. The `exports`/`main` maps do keep `./`.
- **Lockfile:** after changing dependencies or the version, run a full
  `npm install` (not `npm install --package-lock-only`, which can leave the
  lockfile inconsistent and break `npm ci` on the CI runners). Validate with
  `npm ci` if unsure.
- **CI:** `.github/workflows/ci.yml` runs `typecheck → build → test` on Node
  20/22/24 for pushes/PRs to `main`. There is intentionally **no publish job**.
- **Publishing is manual.** Do not run `npm publish` or set up auto-publish
  without an explicit go-ahead from the maintainer.
- **Identity:** npm scope is `@headwall` (personal scope of npm user
  `headwall`); the GitHub org is `headwalluk`. These differ — repository URLs
  use `headwalluk`, the package name uses `@headwall`.

## Scope (v1)

Supported: paragraphs, headings, fenced/indented code, ordered/unordered/nested
lists, blockquotes, thematic breaks, GFM tables, images (resolver-driven), raw
HTML (→ `core/html`), and inline bold/italic/code/strikethrough/links/hard
breaks. GFM task items render a glyph (`☐`/`☑`), not interactive inputs.

Out of scope: syntax highlighting (core has none; `codeLanguage: 'class'` is an
opt-in hook for plugins), per-column table alignment, media uploads (the agent
does that), and block-theme/Site-Editor constructs (columns, groups, cover…).

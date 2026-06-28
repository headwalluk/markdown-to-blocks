# Hand-off: `markdown-to-blocks`

A small, dependency-light TypeScript library that converts a Markdown string into **serialised WordPress/Gutenberg block markup** (HTML with `<!-- wp:… -->` delimiters), using **core blocks only**, such that the result validates first-time in the block editor with no "Convert to blocks" / "unexpected content" prompts.

Intended consumer: a Node/TypeScript AI agent that reads project `docs/*.md` and POSTs the result to WordPress via the REST API (`content` field). No browser, no `@wordpress/*` runtime dependency, no DOM.

---

## 1. Goal & non-goals

**Goal.** `markdown → string of block markup` that, when written to `post_content`, the editor parses into discrete native blocks.

**In scope (the supported Markdown subset):**

- Paragraphs
- Headings (`#`–`######`)
- Fenced and indented code blocks
- Unordered / ordered lists, including nesting
- Blockquotes
- Thematic breaks (`---`, `***`, `___`)
- Tables (GFM)
- Inline: bold, italic, inline code, links, strikethrough, hard line breaks
- Images (via an injectable resolver — see §6)
- Raw inline/block HTML in the source (routed to `core/html`)

**Non-goals (document them as "Limitations", don't implement in v1):**

- Syntax highlighting (core `core/code` has none; see §5.3 for the optional language hook)
- Per-column table alignment (phase 2)
- GFM footnotes, task-list checkboxes as interactive inputs (render a glyph; see §5.9)
- Media library uploads (the agent does that and feeds results via `resolveImage`)
- Block themes / Site Editor constructs (columns, groups, cover, etc.)

**Hard requirement.** Output must be **deterministic and pure** — no network, no filesystem, no global state. The CLI layer (§8) is the only place that touches `fs`/`stdout`.

---

## 2. Architecture

Parse Markdown to an **mdast** tree (via `remark`), then walk it. Each block-level node maps to one block renderer that returns a string; inline content is rendered by a separate inline renderer that returns the inner HTML string.

```
markdown string
   │  remark-parse (+ remark-gfm, + remark-frontmatter)
   ▼
mdast tree
   │  walk top-level children → blocks[]
   ▼
string[]  ──join("\n\n")──▶  block markup string
```

**Recommended dependencies**

Runtime:
- `unified`, `remark-parse`, `remark-gfm`
- `remark-frontmatter` (only for the document-level helper in §6)
- `@types/mdast` (dev, for node typings)

Dev / build:
- `typescript`, `tsup` (dual ESM+CJS+types), `vitest`
- Validation harness only: `@wordpress/blocks`, `@wordpress/block-library`, `jsdom` (see §7) — **devDependencies, never shipped**

> Alternative considered: `markdown-it` is lighter but gives a flat token stream that's more imperative to walk. `remark`/mdast gives a clean recursive AST that suits the renderer design below and the SESE style. Prefer `remark` unless bundle size becomes a problem.

### Code-style constraints (follow these)

- **Single Entry, Single Exit.** Each renderer builds a local accumulator (string or string[]) and has **one** `return` at the end. Do **not** `return` from inside a loop — iterate, append to the accumulator, return after the loop.
- **Guard clauses at the top of a function are fine** (e.g. bail early if a node has no children).
- Keep each block renderer in its own module (`src/blocks/<name>.ts`) so the node-type → block mapping is one obvious switch.

---

## 3. Public API

```ts
// src/index.ts

export interface ResolvedImage {
  url: string;
  alt?: string;
  id?: number;        // WordPress attachment ID → enables wp-image-{id} + size class
  sizeSlug?: string;  // e.g. 'large', 'full'; only used when id is present
  caption?: string;
}

export interface ConvertOptions {
  /** Shift every heading level by this amount. Default 0.
   *  Set to 1 for docs whose first section is `#`, so `#`→h2 and body never emits h1. */
  headingShift?: number;

  /** Clamp resulting heading levels into [min, 6]. Default min = 2 (avoid body h1). */
  minHeadingLevel?: number;

  /** Resolve a Markdown image to a WordPress image. Return undefined to emit an
   *  "external" image block (no attachment id). The agent supplies this after
   *  uploading to the media library. */
  resolveImage?: (src: string, alt: string, title?: string) => ResolvedImage | undefined;

  /** 'drop' (default): core behaviour, language is discarded.
   *  'class': add `language-xxx` to the <code> for a Prism/highlight.js plugin. */
  codeLanguage?: 'drop' | 'class';

  /** How to handle unsupported / raw-HTML nodes. 'html' (default) → core/html. 'skip' → omit. */
  unsupported?: 'html' | 'skip';

  /** Enable GFM (tables, strikethrough, autolinks). Default true. */
  gfm?: boolean;
}

/** Convert Markdown to a single serialised block-markup string. */
export function markdownToBlocks(markdown: string, options?: ConvertOptions): string;

/** Same, but returns one string per top-level block (composable). */
export function markdownToBlockList(markdown: string, options?: ConvertOptions): string[];

export interface ParsedDocument {
  frontmatter: Record<string, unknown>;
  blocks: string;
}

/** Strip YAML frontmatter (returned separately for title/date/etc.) and convert the body.
 *  The agent uses frontmatter to populate REST fields (title, slug, date) rather than body. */
export function parseMarkdownDocument(markdown: string, options?: ConvertOptions): ParsedDocument;
```

`markdownToBlocks` joins the block list with `\n\n` (matches WordPress's between-block spacing).

---

## 4. Suggested file layout

```
markdown-to-blocks/
├─ src/
│  ├─ index.ts            // public exports
│  ├─ convert.ts          // orchestration: parse → walk → join
│  ├─ inline.ts           // renderInline(children): string
│  ├─ escape.ts           // escapeText / escapeCode helpers
│  ├─ types.ts
│  └─ blocks/
│     ├─ paragraph.ts
│     ├─ heading.ts
│     ├─ code.ts
│     ├─ list.ts          // handles nesting + list-item
│     ├─ quote.ts
│     ├─ table.ts
│     ├─ separator.ts
│     ├─ image.ts
│     └─ html.ts
├─ test/
│  ├─ fixtures/           // *.md  +  *.expected.html pairs (see §7)
│  ├─ blocks.test.ts
│  └─ validate.test.ts    // WP validation harness
├─ bin/
│  └─ cli.ts              // optional, see §8
├─ package.json
├─ tsconfig.json
├─ tsup.config.ts
├─ README.md
└─ LICENSE
```

---

## 5. Block markup reference (the important part)

These are the **target outputs**. Reproduce the whitespace as shown — it matches WordPress's own serialiser, which is the known-good shape. Anything marked *version-sensitive* should be confirmed by the validation harness (§7) against the actual WP install, because core occasionally adds classes/attributes; older shapes generally still validate via registered block deprecations, but match current core where you can.

### 5.1 Paragraph

```html
<!-- wp:paragraph -->
<p>Text with <strong>bold</strong> and <a href="https://example.com">a link</a>.</p>
<!-- /wp:paragraph -->
```

Empty paragraphs (blank source lines) should be **dropped**, not emitted.

### 5.2 Heading — *`wp-block-heading` class is version-sensitive (WP 5.9+)*

Default level is 2, which omits the `level` attribute. Levels 1 and 3–6 carry it.

```html
<!-- wp:heading -->
<h2 class="wp-block-heading">A section</h2>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">A subsection</h3>
<!-- /wp:heading -->
```

Apply `headingShift` then clamp to `[minHeadingLevel, 6]`. With `minHeadingLevel: 2` (default), a source `#` after shifting/clamping becomes `h2`.

### 5.3 Code — escape `& < >` only; never escape quotes

```html
<!-- wp:code -->
<pre class="wp-block-code"><code>if ($a &lt; $b &amp;&amp; $c &gt; 0) { echo "&lt;x&gt;"; }</code></pre>
<!-- /wp:code -->
```

- Newlines inside the block are preserved verbatim.
- The fence language (```` ```php ````) is discarded by default. With `codeLanguage: 'class'`, emit `<code class="language-php">` for a syntax-highlighting plugin — note this is **not** core behaviour and only validates if such a plugin registers the attribute, so keep it opt-in.

### 5.4 List — nested `list-item` blocks (WP 6.0+). This is the #1 gotcha.

Unordered:

```html
<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>First</li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li>Second</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list -->
```

Ordered adds the attribute and uses `<ol>`:

```html
<!-- wp:list {"ordered":true} -->
<ol class="wp-block-list"><!-- wp:list-item -->
<li>One</li>
<!-- /wp:list-item --></ol>
<!-- /wp:list -->
```

**Nested list** — the child list block lives *inside* the parent `<li>`, after the item text, before `</li>`:

```html
<!-- wp:list-item -->
<li>Parent item<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li>Child item</li>
<!-- /wp:list-item --></ul>
<!-- /wp:list --></li>
<!-- /wp:list-item -->
```

Note the exact joins: the first `<!-- wp:list-item -->` sits on the **same line** as `<ul class="wp-block-list">`; items are separated by a blank line; the closing `</ul>` is attached directly to the final `<!-- /wp:list-item -->`.

### 5.5 Blockquote — contains inner paragraph blocks (quote v2)

```html
<!-- wp:quote -->
<blockquote class="wp-block-quote"><!-- wp:paragraph -->
<p>Quoted line one.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Quoted line two.</p>
<!-- /wp:paragraph --></blockquote>
<!-- /wp:quote -->
```

### 5.6 Separator — *class set is version-sensitive*

```html
<!-- wp:separator -->
<hr class="wp-block-separator has-alpha-channel-opacity"/>
<!-- /wp:separator -->
```

### 5.7 Table (GFM) — figure wrapper; v1 ignores per-column alignment

```html
<!-- wp:table -->
<figure class="wp-block-table"><table><thead><tr><th>Name</th><th>Type</th></tr></thead><tbody><tr><td>id</td><td>int</td></tr></tbody></table></figure>
<!-- /wp:table -->
```

Cell contents go through the inline renderer. Alignment classes are phase 2.

### 5.8 Image — resolver-driven (§6)

With a resolved attachment (`resolveImage` returned an `id`):

```html
<!-- wp:image {"id":123,"sizeSlug":"large","linkDestination":"none"} -->
<figure class="wp-block-image size-large"><img src="https://site/wp-content/uploads/x.png" alt="Alt text" class="wp-image-123"/></figure>
<!-- /wp:image -->
```

External fallback (no `id` available):

```html
<!-- wp:image -->
<figure class="wp-block-image"><img src="https://example.com/x.png" alt="Alt text"/></figure>
<!-- /wp:image -->
```

### 5.9 HTML fallback & edge cases

- Raw HTML nodes in the source → `core/html` (content **not** escaped):
  ```html
  <!-- wp:html -->
  <div class="custom">raw</div>
  <!-- /wp:html -->
  ```
- Hard line break inside a paragraph → `<br>`.
- GFM task list items → render a leading glyph (`☐` / `☑`) in the `<li>` text; do not emit interactive inputs in v1.
- Anything genuinely unsupported follows the `unsupported` option (`'html'` wraps the rendered HTML in `core/html`; `'skip'` omits it).

### 5.10 Inline rendering rules

Operate on inline mdast nodes, returning inner HTML:

| Markdown | Output |
|---|---|
| `**x**` / `__x__` | `<strong>x</strong>` |
| `*x*` / `_x_` | `<em>x</em>` |
| `` `x` `` | `<code>x</code>` (escape `& < >` in `x`) |
| `~~x~~` (GFM) | `<s>x</s>` |
| `[t](u)` | `<a href="u">t</a>` |
| hard break | `<br>` |
| text | escape `& < >` |

**Escaping discipline:** escape **once**, straight from the raw mdast `value` of text/inlineCode nodes. Formatting nodes emit tags directly and must not be re-escaped. Do not escape `"` anywhere (neither code nor attributes need it here). Test for double-encoding (`&amp;lt;` is a bug).

---

## 6. Images & frontmatter (agent integration)

The converter stays pure. The agent owns I/O:

- **Images:** before/while converting, the agent uploads each referenced image to the media library (REST `wp/v2/media`), then passes a `resolveImage(src, alt, title)` that returns `{ id, url, sizeSlug }`. When it returns `undefined`, the converter emits the external-image fallback (§5.8). Keep a single source-of-truth map in the agent, not in the library.
- **Frontmatter:** use `parseMarkdownDocument` to peel YAML frontmatter off the top. The agent maps `title`, `slug`, `date`, etc. to REST post fields — these must **not** appear in `post_content`. Only the body is converted to blocks.
- **Heading policy for docs:** docs typically open with a single `#` title. Either let frontmatter carry the title and set `headingShift: 1` so the first in-body `#` becomes `h2`, or strip a leading `#` title node before conversion. Document whichever you pick; default `headingShift` is 0.

---

## 7. Testing & the validation harness (do this — it's what guarantees "validates first time")

Two layers:

**a) Golden fixtures.** `test/fixtures/*.md` paired with `*.expected.html`. `vitest` asserts `markdownToBlocks(md) === expected`. Cover at minimum: each block type in §5, a nested list, a code block containing `< > &` and quotes, a table, mixed inline formatting, an empty-paragraph case, and a raw-HTML case.

**b) WordPress validation harness (`validate.test.ts`).** Prove the emitted markup actually validates against core's own parser, using `@wordpress/blocks` as a **dev** dependency only:

- Set up `jsdom` to provide `document`/`window`.
- `import { registerCoreBlocks } from '@wordpress/block-library'` and call it.
- For each fixture's output, run the core parser and assert there are **zero** validation errors (use `@wordpress/blocks` `parse` + the block validation utilities; assert every parsed block `isValid`).

This harness is the empirical check on every *version-sensitive* note in §5: if core changes a class or attribute, this test fails and tells you exactly what to update — you never have to eyeball markup again. Pin the `@wordpress/*` versions to match the target WP install, and bump deliberately.

> Optional belt-and-braces: a manual smoke test against the local WP dev site on the Pi — POST a converted doc via REST, open it in the editor, confirm no recovery banners. Good for first run; the automated harness is what gates CI.

**CI:** GitHub Actions on push/PR — `install → build → vitest` (fixtures + validation harness) across Node 18/20/22. Mirror the CI structure already used in the `rtl8852au` project.

---

## 8. Optional CLI

A thin `bin/cli.ts` so the converter can be shelled out to as well as imported:

```
md2blocks <file.md>           # prints block markup to stdout
md2blocks <file.md> --frontmatter   # prints JSON { frontmatter, blocks }
cat doc.md | md2blocks -      # read stdin
```

Keep all `fs`/`stdout` here; the library core stays pure. Wire it via the `bin` field in `package.json` and the `tsup` build.

---

## 9. Packaging for npm

- **Name:** check availability first (`npm view <name>`). Options: scoped `@headwalluk/markdown-to-blocks`, or an unscoped descriptive name. Scoped is safest for first publish.
- **Build:** `tsup` emitting ESM + CJS + `.d.ts`. `"type": "module"`, `"sideEffects": false`.
- **`package.json` essentials:**
  - `"exports"` map (import/require/types), `"main"`, `"module"`, `"types"`
  - `"files": ["dist"]` (ship build output only)
  - `"bin": { "md2blocks": "dist/cli.js" }` if including the CLI
  - `"engines": { "node": ">=18" }`
  - `"prepublishOnly": "npm run build && npm test"`
- **`@wordpress/*` and `jsdom` are `devDependencies`** — they must never end up in the runtime dependency tree.
- **README:** quick-start, the supported-subset table, the Limitations list from §1, and a short note on how block validation works so users understand the design.
- **LICENSE:** MIT is the conventional default for a standalone TS library; choose GPL if you specifically want WordPress-ecosystem alignment.
- **Versioning:** start `0.x` while the block-markup shapes are being confirmed against real WP; promote to `1.0.0` once the validation harness is green and the API has settled.

---

## 10. Build order for Claude Code

1. Scaffold: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest` config, empty `src/` layout.
2. `escape.ts` + `inline.ts` with unit tests (escaping is the easiest thing to get subtly wrong).
3. `convert.ts` orchestration: remark parse → walk top-level → join. Stub block renderers.
4. Implement block renderers in this order: paragraph, heading, code, list (incl. nesting), quote, separator, table, html, image. Add a golden fixture per renderer as you go.
5. Stand up the WP validation harness; make it green for every fixture.
6. `parseMarkdownDocument` (frontmatter) + `resolveImage` wiring.
7. Optional CLI.
8. README, LICENSE, GitHub Actions CI, then `npm publish --access public`.

**Definition of done:** every fixture round-trips through the §7 validation harness with zero block-validation errors, and a real converted `docs/` file opens in the WP editor as native blocks with no recovery prompts.

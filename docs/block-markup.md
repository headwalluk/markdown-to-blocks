# Block markup reference

For developers working on the renderers. This is the exact shape each renderer emits, and why it
looks that way. The shape matches WordPress's own serialiser byte for byte; `test/validate.test.ts`
checks every fixture against core, so a change here that core disagrees with fails the build.

## General shape

- Each block is `<!-- wp:name {attributes} -->`, a newline, the block's HTML, a newline, and
  `<!-- /wp:name -->`. Top-level blocks are joined with one blank line (`\n\n`).
- **Whitespace is load-bearing.** It matches core's serialiser, which is the known-good shape.
  Don't tidy it.
- **Attributes** are serialised by `serializeBlockAttributes` (`src/attributes.ts`): nothing at
  all for an empty object (core omits the braces), otherwise ` ` plus JSON. The JSON is escaped
  as `@wordpress/blocks` escapes it: `--`, `<`, `>`, `&` and the no-break space become `\u`
  escapes, so the JSON can sit inside an HTML comment without closing it early.
- **Attribute order** is the insertion order of the object, and callers set it to match core
  (`level` before `anchor`; on a tag, `id` before `class`, and `start` before `class`).

## Escaping

- Text and code escape `& < >` exactly once, straight from the raw mdast `value`. Formatting
  nodes emit tags directly and are never re-escaped, so there is no `&amp;lt;`.
- Quotes in visible text and code are left as they are. Attribute values (`href`, `src`, `alt`,
  `title`) also escape `"`.
- Code blocks then apply core/code's own save-time `escape()` (block-library `code/utils.js`):
  `[` becomes `&#91;` so shortcodes don't run, and the first URL alone on its line gets
  `&#47;&#47;` so it isn't auto-embedded. Core's regex has no `g` flag, so only the first such
  URL is escaped.

## Reference links and images

`[text][ref]` and `![alt][ref]` are rewritten in place into plain links and images, using their
`[ref]: url` definitions, before rendering. Renderers only ever see resolved nodes, and a
reference image alone in a paragraph becomes a core/image like any other. A reference with no
matching definition is left alone and renders as text.

## Paragraph (core/paragraph)

- An empty paragraph (no rendered content) is dropped.
- A paragraph whose only child is an image becomes a core/image, because Gutenberg has no inline
  image block. So does one whose only child is a link around only an image
  (`[![alt](src)](href)`), which becomes a linked core/image.

## Heading (core/heading)

- `headingShift` is applied, then the level is clamped into `[minHeadingLevel, 6]`.
- Level 2 is the block's default and carries no `level` attribute; every other level does.
- The `wp-block-heading` class is current core (WordPress 5.9+).
- With `headingAnchors`, the `anchor` attribute and the `id` come from the heading's text: its
  raw text and code values, ignoring formatting, slugged GitHub-style (`src/slug.ts`).
  `slugify` lowercases, drops anything that isn't a letter, number, underscore, space or hyphen,
  and turns each space into a hyphen without collapsing runs, so `Foo & Bar` becomes `foo--bar`.
  A repeated slug in one document gets `-1`, `-2` and so on. A heading that slugs to nothing gets
  no `id`.

## Code (core/code)

- Only `& < >` are escaped, then core/code's save-time escaping (see Escaping). Newlines are kept.
- The fence language is dropped by default, as core has no highlighting. With
  `codeLanguage: 'class'` it becomes `class="language-xxx"` on the `<code>`, for a highlighter
  plugin. That is opt-in, not core behaviour.

## List (core/list and core/list-item, WordPress 6.0+)

- The first `<!-- wp:list-item -->` sits on the **same line** as the opening
  `<ul class="wp-block-list">` or `<ol class="wp-block-list">`.
- List items are separated by one blank line.
- The final `<!-- /wp:list-item -->` attaches directly to `</ul>` or `</ol>`.
- A nested list sits inside its parent `<li>`, straight after the item text and before `</li>`.
- An ordered list that doesn't start at 1 carries `start` both in the attributes and on the
  `<ol>`, ahead of `class`.
- A loose item's paragraphs are joined with `<br>`. Any other block content in an item is
  rendered as a block and kept, so nothing is silently dropped.
- A GFM task item gets a leading `☐` or `☑` glyph, not an interactive input.

## Quote (core/quote, version 2)

The quote contains inner blocks, rendered through the same dispatcher, so any supported block can
nest inside. The first inner block's opening comment sits directly after
`<blockquote class="wp-block-quote">`, inner blocks are separated by a blank line, and the final
closing comment attaches directly to `</blockquote>`.

## Separator (core/separator)

`<hr class="wp-block-separator has-alpha-channel-opacity"/>`. The class set is current core and
version-sensitive; the validation harness checks it.

## Table (core/table)

Wrapped in `<figure class="wp-block-table">`. The first row is the header (`<th>` in `<thead>`),
the rest are body rows (`<td>` in `<tbody>`). Cell contents go through the inline renderer.
Per-column alignment isn't emitted yet.

## Image (core/image)

Driven by the `resolveImage` option (`src/resolve-image.ts`, shared with inline images):

- When the resolver returns an attachment `id`, the **library** shape: the comment carries `id`,
  then `sizeSlug`, then `linkDestination`; the figure gets `size-<slug>`; the `<img>` gets
  `wp-image-<id>`.
- Otherwise the **external** shape: a bare figure and `<img>` with no id.
- An `id` that isn't a positive safe integer throws a `RangeError`.
- An image whose final URL fails the `urlSchemes` policy is dropped.
- A linked image wraps the `<img>` in `<a href>`. `linkDestination` is `media` when the href is
  the image's own file and `custom` otherwise. "Own file" means the same path once the query,
  fragment and WordPress's generated-size suffixes (`-1024x768`, `-scaled`) are removed; a
  relative URL is compared by path alone. A link whose href fails the policy is dropped and the
  image renders unlinked.
- The caption is the resolver's `caption`, else the Markdown image title, rendered as
  `<figcaption class="wp-element-caption">`. That class is current core and version-sensitive.
- An image mixed with text inside a paragraph stays inline as a bare `<img>` (with
  `wp-image-<id>` when resolved), or nothing when its URL fails the policy.

## Raw HTML and unsupported nodes (core/html)

Block-level raw HTML, and any block node without a renderer that has a raw value, goes into
core/html verbatim, never escaped. Inline HTML passes through verbatim. Under
`unsupported: 'skip'` both are dropped. Frontmatter (`yaml`) and link or footnote definitions
emit no block.

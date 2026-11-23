# Untrusted Markdown

For anyone converting Markdown they don't control: user input, scraped pages, another model's
output.

The converter escapes text correctly, but it is **not an HTML sanitiser**:

- **Raw HTML passes through by default.** Use `unsupported: 'skip'` (`--unsupported skip`) to
  drop both block and inline HTML. WordPress strips unsafe HTML on save only for accounts without
  the `unfiltered_html` capability, so don't rely on that when posting as an administrator.
- **Shortcodes in prose still run.** `[gallery]` in a paragraph is rendered by WordPress as a
  shortcode, exactly as if typed in the editor. Inside fenced code blocks `[` is escaped as
  `&#91;`, matching what the block editor itself saves, so code examples display literally.
  Inline code is not escaped: the editor would undo it on the next edit.
- **Size is the caller's to bound.** Nesting deeper than 200 levels (quotes, lists and inline
  formatting combined) throws a `RangeError`; overall input size is not limited, so cap it before
  converting if the source is untrusted.

## URL safety

By default (`urlSchemes: 'safe'`):

- **Links** keep their `href` only for `http:`, `https:`, `mailto:`, `tel:` and relative URLs
  (`/about`, `#top`). Any other scheme (`javascript:`, `data:`, `vbscript:`, …) renders as the
  link text alone.
- **Images** need an `http:`, `https:` or relative URL; any other image is dropped.

The scheme is read the way a browser reads it, so `JAVASCRIPT:`, `java&#9;script:` and leading
whitespace are all caught. Pass `urlSchemes: 'any'` (`--url-schemes any`) to turn the check off.

# Command line: `md2blocks`

For anyone converting Markdown from a shell or a script. Install with
`npm install -g @headwall/markdown-to-blocks` (Node 22 or later).

## Usage

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

Each conversion option matches a library option of the same name; see
[library-api.md](library-api.md#convertoptions).

## Examples

```bash
# Convert a file to block markup
md2blocks -i BLOG-POST.md -o blog-post.html

# Or write to stdout and redirect
md2blocks -i BLOG-POST.md > blog-post.html

# Or pipe via stdin
cat BLOG-POST.md | md2blocks - > blog-post.html

# Docs that open with a single "#" title: shift so "#" becomes h2, never a body h1
md2blocks -i README.md --heading-shift 1 -o readme.html

# Keep code-fence languages as language-xxx classes for a highlighter plugin
md2blocks -i snippet.md --code-language class

# Frontmatter and body together, as JSON
md2blocks -i post.md --frontmatter
```

Reading stdin from a terminal with nothing piped in is refused with a usage hint, rather than
waiting forever.

## Output

Markup (or, with `--frontmatter`, JSON) goes to stdout or the `--output` file. Errors and usage
messages go to stderr. Every argument problem is reported together, before any conversion.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success, including `--help` and `--version` |
| 1 | Failure: invalid arguments or option values, unreadable input, or a conversion error (such as Markdown nested too deeply) |
| 141 | The reader closed the pipe early (`md2blocks … \| head`), as a shell reports for SIGPIPE |

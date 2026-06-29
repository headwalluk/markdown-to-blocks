# Ideas & backlog

A running list of potential improvements and new functionality — not commitments.
Pick from here when planning the next round of work. Keep entries short; move the
detail into an issue or a CHANGELOG entry when something gets built.

## Markdown fidelity

- **Per-column table alignment.** mdast `table.align` carries `left|center|right`
  per column; emit the matching core/table cell alignment. (Deferred from v1.)
- **Image `title` → caption.** `![alt](url "caption")` could populate a
  `<figcaption>` instead of being dropped.
- **GFM footnotes.** `footnoteReference` / `footnoteDefinition` are currently
  ignored. Decide on a rendering (e.g. a notes section, or core/footnotes).
- **Multi-paragraph list items.** Loose list items with several paragraphs are
  currently joined with `<br>`; consider richer handling if it matters.
- **Definition lists / other extensions.** Only if a real need appears.

## Output options

- **Syntax highlighting beyond `codeLanguage: 'class'`.** Core has none; the
  `'class'` hook exists for plugins. Could add presets for common highlighters.
- **Configurable heading clamp/shift presets** (e.g. a "docs" profile that
  strips a leading `#` title automatically).

## CLI / UX

- **CLI tests.** Cover arg parsing, stdin/`-`, `-i`/`-o`, and `--frontmatter`.
  (The CLI surface is currently only manually verified.)
- **Friendlier errors.** e.g. clearer message when an input file doesn't exist.
- **`--out-dir` / batch mode.** Convert many files at once.

## Docs

- **Node `fetch` REST example** in the README, alongside the curl one, for the
  AI-agent-in-Node audience.
- **Recipes** section: common agent workflows (upload images then resolve,
  frontmatter → REST fields, draft vs publish).

## Tooling / project

- **Formatter/linter** (Prettier + ESLint), ideally with a rule that discourages
  `return` inside loops to enforce the SESE style from `CLAUDE.md`.
- **npm publish provenance** (`--provenance` via GitHub Actions OIDC) — only if
  publishing ever moves to CI; currently publishing is manual by choice.
- **Coverage reporting** in CI.

## Possible future blocks

- Pull quotes, code with captions, or other core blocks if Markdown sources
  start needing them. Stay within core blocks (no block-theme/Site-Editor
  constructs) unless the scope deliberately changes.

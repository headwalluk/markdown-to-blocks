# CLAUDE.md

Repository: public

House style: the headwall-node-ts skill. This file holds only what is specific to
markdown-to-blocks.

## What this is

`@headwall/markdown-to-blocks` converts Markdown into serialised
WordPress/Gutenberg **core-block** markup (HTML with `<!-- wp:… -->`
delimiters) that imports into the block editor with no "Convert to blocks" /
"unexpected content" recovery prompts. Primary consumer: an AI agent (or any
script) that reads Markdown and POSTs it to WordPress via the REST API.

It's a published npm library plus a CLI (`md2blocks`), not a service: no config
file, no environment variables, no logger. Options arrive as `ConvertOptions` or
CLI flags, and are validated together (`validateOptions` in `src/types.ts`).

## Commands

- `npm run check`: typecheck, lint, build and every test. Must pass before work
  is called done
- `npm test`: builds first (`pretest`), then vitest and the lint-rule tests
- `npm run build`: tsup → `dist/`

## Architecture

```
markdown string
  │  remark-parse (+ remark-gfm, + remark-frontmatter)
  ▼
mdast tree
  │  resolve reference links, then dispatch each top-level node to its block renderer
  ▼
string[]  ──join("\n\n")──▶  block markup string
```

- `src/convert.ts`: orchestration: parse, build the `RenderContext`, the
  dispatch `switch` (node type → renderer), join with blank lines.
- `src/blocks/<name>.ts`: **one block renderer per module**.
- `src/inline.ts`: inline (phrasing) renderer; returns inner HTML.
- `src/escape.ts`: escaping helpers. `src/attributes.ts`: block-attribute JSON.
- `src/url.ts`: link/image URL scheme policy (`urlSchemes`).
- `src/resolve-image.ts`: runs `resolveImage`, validates its `id`, applies
  the image URL policy; shared by the block and inline image renderers.
- `src/document.ts`: `parseMarkdownDocument` (frontmatter via `yaml`).
- `src/cli.ts`: the `md2blocks` CLI. **All `fs`/`stdout` lives here.**

`docs/block-markup.md` is the reference for the exact markup each renderer
emits; renderer docblocks cite it. Keep the two in step.

## Hard rules

- **Purity.** The converter does no network, filesystem, or global-state access,
  and is deterministic (same input → same output). Only `src/cli.ts` touches
  I/O. Images are resolved via an injected `resolveImage` callback, never by the
  library itself.
- **Block markup whitespace is load-bearing.** It matches WordPress's own
  serialiser byte for byte (`docs/block-markup.md`). Don't "tidy" it.
- **Escaping discipline.** Escape `& < >` exactly once, from the raw mdast
  `value`; never re-escape formatting output (`&amp;lt;` is a bug). Details in
  `docs/block-markup.md#escaping`.
- **URL policy.** Every link `href` and image `src` (Markdown or resolver) goes
  through `src/url.ts` unless `urlSchemes: 'any'`. New URL-emitting code must
  too.
- **CLI output.** The CLI sets `process.exitCode` and never calls
  `process.exit()` after writing to stdout: exiting at once truncated piped
  output at 64 KB in 1.2.0 and earlier. The stdout `'error'` (EPIPE) handler is
  the one place it exits, as the skill allows.

## Testing

Run by `npm test`:

1. **Golden fixtures**: `test/fixtures/*.md` paired with `*.expected.html`.
   `markdownToBlocks(markdown)` must equal the expected markup byte-for-byte. Add
   a fixture pair for any new block behaviour.
2. **WordPress validation harness**: `test/validate.test.ts` parses every
   fixture's output through WordPress's own parser (`@wordpress/blocks` +
   `@wordpress/block-library`, dev-only, under jsdom) and asserts every block is
   `isValid` with zero issues. If core changes a class or attribute, this test
   says so.
3. **CLI**: `test/cli.test.ts` spawns the **built** `dist/cli.js` (stdout
   through a real pipe, exit codes).
4. **Lint rules**: `tools/eslint-plugin-house/index.test.js` under `node --test`.

`@wordpress/*` packages are inlined by vitest (`server.deps.inline` in
`vitest.config.ts`) because their ESM builds use bare JSON imports Node rejects.

## Build, deps, release

- **Design choices** (differ from the skill's defaults deliberately): vitest,
  tsup bundling to `dist/`, `bin` pointing at `dist/cli.js`, a hand-rolled
  argument parser with no command registry, double quotes with no formatter.
- **Zero runtime dependencies.** All deps (remark/unified/gfm/frontmatter/yaml)
  are `devDependencies` and bundled into `dist/` via `noExternal`. The published
  package has `dependencies: {}`. Keep it that way.
- **`bin` path:** `package.json` `bin` must be `dist/cli.js` **without** a
  leading `./`; npm's publish normalizer strips `./` and can drop the bin
  entirely. The `exports`/`main` maps do keep `./`.
- **Lockfile:** after changing dependencies or the version, run a full
  `npm install` (not `npm install --package-lock-only`, which can leave the
  lockfile inconsistent and break `npm ci` on the CI runners).
- **CI:** `.github/workflows/ci.yml` runs `npm run check` on Node 22/24 for
  pushes/PRs to `main`. There is intentionally **no publish job**.
- **Publishing is manual.** Do not run `npm publish` or set up auto-publish
  without an explicit go-ahead from the maintainer.
- **Identity:** npm scope is `@headwall` (personal scope of npm user
  `headwall`); the GitHub org is `headwalluk`. These differ: repository URLs
  use `headwalluk`, the package name uses `@headwall`.

## Scope (v1)

Supported and out-of-scope Markdown are listed in `docs/supported-markdown.md`.
The backlog of ideas is in `dev-notes/ideas.md` (untracked).

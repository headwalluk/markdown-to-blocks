# Development

For contributors working on the converter itself.

## Setup and commands

```bash
npm install
npm run check      # typecheck, lint and the full test suite: run before calling work done
npm run build      # tsup → dist/ (ESM + .d.ts), dependencies bundled in
npm test           # builds first, then vitest (fixtures, units, WordPress validation, CLI) and the lint-rule tests
npm run typecheck  # tsc --noEmit, covering src/ and test/
npm run lint       # eslint, including the house rules in tools/eslint-plugin-house/
```

Node 22 or later.

## How it fits together

```
markdown string
  │  remark-parse (+ remark-gfm, + remark-frontmatter)
  ▼
mdast tree
  │  resolve reference links, then dispatch each top-level node to its block renderer
  ▼
string[]  ──join("\n\n")──▶  block markup string
```

- `src/convert.ts`: parsing, the render context, and the node-type → renderer dispatch.
- `src/blocks/<name>.ts`: one block renderer per module.
- `src/inline.ts`: the inline (phrasing) renderer.
- `src/cli.ts`: the `md2blocks` CLI, and the only module that does any I/O.

The exact markup each renderer emits, and its escaping rules, are in
[block-markup.md](block-markup.md).

## How validation works

WordPress marks a block "invalid" when the saved markup doesn't match what the block's `save()`
function would produce; that's what triggers the editor's recovery prompts. The test suite
parses every fixture's output through WordPress's own parser (`@wordpress/blocks` and
`@wordpress/block-library`, dev-only, under jsdom) and asserts every block reports `isValid`
with zero validation issues. So "validates first time" is verified empirically, not by eye. If
core changes a class or attribute, this is the test that says so.

## Tests

- **Golden fixtures:** `test/fixtures/*.md` paired with `*.expected.html`. The output must match
  byte for byte. Add a fixture pair for any new block behaviour.
- **WordPress validation:** `test/validate.test.ts`, as above.
- **CLI:** `test/cli.test.ts` spawns the built `dist/cli.js`, so `npm test` builds first.
- **Lint rules:** `tools/eslint-plugin-house/index.test.js`, run with `node --test`.

## Dependencies

There are no runtime dependencies. Everything (remark, unified, GFM, frontmatter, yaml) is a
dev dependency bundled into `dist/` by tsup. Keep `dependencies` empty.

// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBlock, parse, serialize } from "@wordpress/blocks";
import { registerCoreBlocks } from "@wordpress/block-library";
import { beforeAll, describe, expect, it } from "vitest";
import { escapeCode } from "../src/escape.js";
import { markdownToBlocks } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

interface ParsedBlock {
  name: string | null;
  isValid: boolean;
  innerBlocks: ParsedBlock[];
}

/** Walk parsed blocks, collecting the names of any that failed validation. */
function collectInvalid(blocks: ParsedBlock[]): string[] {
  const invalid: string[] = [];
  for (const block of blocks) {
    // Unrecognised content parses as a null-name block; we don't emit those.
    if (block.name != null && block.isValid === false) {
      invalid.push(block.name);
    }
    if (block.innerBlocks.length > 0) {
      invalid.push(...collectInvalid(block.innerBlocks));
    }
  }
  return invalid;
}

describe("WordPress core block validation", () => {
  beforeAll(() => {
    registerCoreBlocks();
  });

  for (const name of fixtures) {
    it(`${name} parses with zero validation errors`, () => {
      const md = readFileSync(join(fixturesDir, `${name}.md`), "utf8");
      const markup = markdownToBlocks(md);
      const blocks = parse(markup) as ParsedBlock[];
      expect(collectInvalid(blocks)).toEqual([]);
    });
  }

  it("headingAnchors output validates against core's parser", () => {
    // Not covered by the fixture loop, which only runs default options. Include
    // a `--`/`&` slug and a duplicate so the anchor escaping is exercised.
    const md = "## My fancy something & something\n\n## Overview\n\n## Overview";
    const markup = markdownToBlocks(md, { headingAnchors: true });
    const blocks = parse(markup) as ParsedBlock[];
    expect(collectInvalid(blocks)).toEqual([]);
  });

  it("non-default heading levels and library images validate", () => {
    const md = "# Top\n\n## Second\n\n![Alt](x.png)";
    const markup = markdownToBlocks(md, {
      headingShift: -1,
      minHeadingLevel: 1,
      resolveImage: () => ({
        url: "https://site/wp-content/uploads/x.png",
        id: 42,
        sizeSlug: "large",
        caption: "A caption",
      }),
    });
    const blocks = parse(markup) as ParsedBlock[];
    expect(collectInvalid(blocks)).toEqual([]);
  });

  it("code blocks match core's serialiser byte-for-byte, shortcode/embed escaping included", () => {
    // Samples avoid `>`: core leaves it raw where we emit `&gt;` (equivalent, both valid).
    const samples = [
      '[gallery ids="1"] & [/gallery]',
      "https://example.com/first\n  https://example.com/second\nsee https://x.test",
      "  http://indented.test/path  \nnext",
      "[[double]] [unclosed",
    ];
    for (const sample of samples) {
      const expected = serialize([createBlock("core/code", { content: escapeCode(sample) })]);
      expect(markdownToBlocks(`~~~\n${sample}\n~~~`), sample).toBe(expected);
    }
  });
});

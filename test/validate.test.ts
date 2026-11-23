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
  .filter((fileName) => fileName.endsWith(".md"))
  .map((fileName) => fileName.replace(/\.md$/, ""))
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
      const markdown = readFileSync(join(fixturesDir, `${name}.md`), "utf8");
      const markup = markdownToBlocks(markdown);
      const blocks = parse(markup) as ParsedBlock[];
      expect(collectInvalid(blocks)).toEqual([]);
    });
  }

  it("headingAnchors output validates against core's parser", () => {
    // Not covered by the fixture loop, which only runs default options. Include
    // a `--`/`&` slug and a duplicate so the anchor escaping is exercised.
    const markdown = "## My fancy something & something\n\n## Overview\n\n## Overview";
    const markup = markdownToBlocks(markdown, { headingAnchors: true });
    const blocks = parse(markup) as ParsedBlock[];
    expect(collectInvalid(blocks)).toEqual([]);
  });

  it("non-default heading levels and library images validate", () => {
    const markdown = "# Top\n\n## Second\n\n![Alt](x.png)";
    const markup = markdownToBlocks(markdown, {
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

  it("linked and captioned images match core's serialiser byte-for-byte", () => {
    const src = "https://ex.com/wp-content/uploads/a-1024x768.png";
    const full = "https://ex.com/wp-content/uploads/a.png";
    const cases: Array<[string, Record<string, unknown>]> = [
      [`[![Alt](${src})](${full})`, { url: src, alt: "Alt", href: full, linkDestination: "media" }],
      [`[![Alt](${src})](https://ex.com/docs/)`, { url: src, alt: "Alt", href: "https://ex.com/docs/", linkDestination: "custom" }],
      [`![Alt](${src} "A caption & more")`, { url: src, alt: "Alt", caption: "A caption &amp; more" }],
      [`[![Alt](${src} "Cap")](${full})`, { url: src, alt: "Alt", href: full, linkDestination: "media", caption: "Cap" }],
    ];
    for (const [markdown, attributes] of cases) {
      expect(markdownToBlocks(markdown), markdown).toBe(serialize([createBlock("core/image", attributes)]));
    }
  });

  it("linked library images match core's serialiser byte-for-byte", () => {
    const full = "https://ex.com/wp-content/uploads/a.png";
    const markup = markdownToBlocks(`[![Alt](a.png)](${full})`, {
      resolveImage: () => ({ url: full, id: 42, sizeSlug: "large" }),
    });
    const expected = serialize([
      createBlock("core/image", { url: full, alt: "Alt", id: 42, sizeSlug: "large", href: full, linkDestination: "media" }),
    ]);
    expect(markup).toBe(expected);
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

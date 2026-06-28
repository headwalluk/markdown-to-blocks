// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@wordpress/blocks";
import { registerCoreBlocks } from "@wordpress/block-library";
import { beforeAll, describe, expect, it } from "vitest";
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
});

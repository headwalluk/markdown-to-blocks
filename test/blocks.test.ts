import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { markdownToBlocks } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

/**
 * Golden fixtures: each `<name>.md` is paired with `<name>.expected.html`.
 * The conversion must equal the expected markup byte-for-byte (trailing newline
 * trimmed, since editors tend to add one to the .html file).
 */
const fixtures = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""))
  .sort();

describe("golden fixtures", () => {
  for (const name of fixtures) {
    it(name, () => {
      const md = readFileSync(join(fixturesDir, `${name}.md`), "utf8");
      const expected = readFileSync(
        join(fixturesDir, `${name}.expected.html`),
        "utf8",
      ).replace(/\n$/, "");
      expect(markdownToBlocks(md)).toBe(expected);
    });
  }
});

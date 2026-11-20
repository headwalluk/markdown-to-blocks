import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isSameMediaFile } from "../src/blocks/image.js";
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

describe("isSameMediaFile", () => {
  const full = "https://ex.com/wp-content/uploads/2026/11/plan.png";
  it("matches the file itself and the sizes WordPress makes of it", () => {
    expect(isSameMediaFile(full, full)).toBe(true);
    expect(isSameMediaFile(full, "https://ex.com/wp-content/uploads/2026/11/plan-1024x768.png")).toBe(true);
    expect(isSameMediaFile(full, "https://ex.com/wp-content/uploads/2026/11/plan-scaled.png")).toBe(true);
    expect(isSameMediaFile(`${full}?ver=2#top`, full)).toBe(true);
    expect(isSameMediaFile("https://EX.com/wp-content/uploads/2026/11/plan.png", full)).toBe(true);
  });
  it("compares a relative url by path", () => {
    expect(isSameMediaFile("/wp-content/uploads/2026/11/plan.png", full)).toBe(true);
  });
  it("rejects other files, other hosts and pages", () => {
    expect(isSameMediaFile("https://ex.com/wp-content/uploads/2026/11/plan-b.png", full)).toBe(false);
    expect(isSameMediaFile("https://other.test/wp-content/uploads/2026/11/plan.png", full)).toBe(false);
    expect(isSameMediaFile("https://ex.com/docs/", full)).toBe(false);
    expect(isSameMediaFile("https://ex.com", "https://ex.com")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { serializeBlockAttributes } from "../src/attributes.js";
import { createHeadingSlugger, slugify } from "../src/slug.js";

describe("slugify", () => {
  it("lowercases, drops punctuation, spaces → hyphens", () => {
    expect(slugify("My fancy something & something")).toBe(
      "my-fancy-something--something",
    );
  });

  it("keeps letters, numbers, underscores and existing hyphens", () => {
    expect(slugify("Step 2: set_up the pre-flight check!")).toBe(
      "step-2-set_up-the-pre-flight-check",
    );
  });

  it("keeps unicode letters", () => {
    expect(slugify("Café details")).toBe("café-details");
  });

  it("returns empty string for punctuation/emoji-only text", () => {
    expect(slugify("🎉")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});

describe("createHeadingSlugger", () => {
  it("appends -1, -2, … to duplicate slugs", () => {
    const s = createHeadingSlugger();
    expect(s.slug("Overview")).toBe("overview");
    expect(s.slug("Overview")).toBe("overview-1");
    expect(s.slug("Overview")).toBe("overview-2");
    expect(s.slug("Other")).toBe("other");
  });

  it("never de-duplicates empty slugs (each stays empty)", () => {
    const s = createHeadingSlugger();
    expect(s.slug("🎉")).toBe("");
    expect(s.slug("🎉")).toBe("");
  });
});

describe("serializeBlockAttributes", () => {
  it("returns '' for an empty object", () => {
    expect(serializeBlockAttributes({})).toBe("");
  });

  it("escapes -- < > & as core does, preserving key order", () => {
    expect(
      serializeBlockAttributes({ level: 3, anchor: "a--b" }),
    ).toBe(' {"level":3,"anchor":"a\\u002d\\u002db"}');
  });
});

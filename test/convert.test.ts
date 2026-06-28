import { describe, expect, it } from "vitest";
import {
  markdownToBlockList,
  markdownToBlocks,
  parseMarkdownDocument,
  type ResolvedImage,
} from "../src/index.js";

describe("headings", () => {
  it("clamps a source # to h2 by default (no body h1)", () => {
    expect(markdownToBlocks("# Title")).toContain(
      '<h2 class="wp-block-heading">Title</h2>',
    );
  });

  it("applies headingShift then clamps", () => {
    // # shifted by 1 → 2 → h2 (default min 2)
    expect(markdownToBlocks("# Title", { headingShift: 1 })).toContain("<h2");
    // ## shifted by 2 → 4 → h4 with level attr
    expect(markdownToBlocks("## Sub", { headingShift: 2 })).toContain(
      '<!-- wp:heading {"level":4} -->',
    );
  });

  it("never exceeds h6", () => {
    expect(markdownToBlocks("###### Deep", { headingShift: 3 })).toContain(
      '<!-- wp:heading {"level":6} -->',
    );
  });
});

describe("images", () => {
  it("emits the library shape when the resolver returns an id", () => {
    const resolveImage = (src: string): ResolvedImage => ({
      url: "https://site/wp-content/uploads/x.png",
      id: 123,
      sizeSlug: "large",
      alt: "Alt text",
      caption: undefined,
      // src is ignored in this stub
      ...(src ? {} : {}),
    });
    const out = markdownToBlocks("![Alt text](x.png)", { resolveImage });
    expect(out).toBe(
      '<!-- wp:image {"id":123,"sizeSlug":"large","linkDestination":"none"} -->\n' +
        '<figure class="wp-block-image size-large"><img src="https://site/wp-content/uploads/x.png" alt="Alt text" class="wp-image-123"/></figure>\n' +
        "<!-- /wp:image -->",
    );
  });

  it("falls back to the external shape when the resolver returns undefined", () => {
    const out = markdownToBlocks("![Alt](https://ext/x.png)", {
      resolveImage: () => undefined,
    });
    expect(out).toContain('<figure class="wp-block-image"><img');
    expect(out).not.toContain("wp-image-");
  });
});

describe("task lists", () => {
  it("renders a leading glyph and no interactive input", () => {
    const out = markdownToBlocks("- [x] done\n- [ ] todo");
    expect(out).toContain("<li>☑ done</li>");
    expect(out).toContain("<li>☐ todo</li>");
    expect(out).not.toContain("<input");
  });
});

describe("hard line break", () => {
  it("renders <br> inside a paragraph", () => {
    expect(markdownToBlocks("line one  \nline two")).toContain(
      "<p>line one<br>line two</p>",
    );
  });
});

describe("parseMarkdownDocument", () => {
  it("peels YAML frontmatter and converts only the body", () => {
    const md = "---\ntitle: Hello\ndate: 2026-01-01\n---\n\n# Body\n";
    const doc = parseMarkdownDocument(md);
    expect(doc.frontmatter.title).toBe("Hello");
    expect(doc.blocks).toContain('<h2 class="wp-block-heading">Body</h2>');
    expect(doc.blocks).not.toContain("title");
  });

  it("returns an empty object when there is no frontmatter", () => {
    const doc = parseMarkdownDocument("# Body");
    expect(doc.frontmatter).toEqual({});
  });
});

describe("markdownToBlockList", () => {
  it("returns one entry per top-level block", () => {
    const list = markdownToBlockList("# A\n\nbody\n");
    expect(list).toHaveLength(2);
  });
});

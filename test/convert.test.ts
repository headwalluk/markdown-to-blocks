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

describe("heading anchors", () => {
  it("emits no id by default", () => {
    expect(markdownToBlocks("## Overview")).toBe(
      '<!-- wp:heading -->\n<h2 class="wp-block-heading">Overview</h2>\n<!-- /wp:heading -->',
    );
  });

  it("derives a GitHub-style slug and matches core's serialiser byte-for-byte", () => {
    // The `&` is dropped and its two surrounding spaces each become a hyphen,
    // so the slug carries `--`, which core escapes as -- in the
    // attribute JSON. `id` precedes `class` on the tag, as core emits it.
    expect(
      markdownToBlocks("## My fancy something & something", {
        headingAnchors: true,
      }),
    ).toBe(
      '<!-- wp:heading {"anchor":"my-fancy-something\\u002d\\u002dsomething"} -->\n' +
        '<h2 id="my-fancy-something--something" class="wp-block-heading">My fancy something &amp; something</h2>\n' +
        "<!-- /wp:heading -->",
    );
  });

  it("orders level before anchor for non-h2 headings", () => {
    expect(
      markdownToBlocks("### **Deep** _dive_", { headingAnchors: true }),
    ).toContain('<!-- wp:heading {"level":3,"anchor":"deep-dive"} -->');
  });

  it("de-duplicates repeated slugs per document", () => {
    const out = markdownToBlocks("## Overview\n\n## Overview\n\n## Overview", {
      headingAnchors: true,
    });
    expect(out).toContain('id="overview"');
    expect(out).toContain('id="overview-1"');
    expect(out).toContain('id="overview-2"');
  });

  it("omits the id when the heading slugs to nothing", () => {
    expect(markdownToBlocks("## 🎉", { headingAnchors: true })).toBe(
      '<!-- wp:heading -->\n<h2 class="wp-block-heading">🎉</h2>\n<!-- /wp:heading -->',
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

  it("escapes a resolver-supplied sizeSlug in the attributes and class", () => {
    const out = markdownToBlocks("![Alt](x.png)", {
      resolveImage: () => ({ url: "x.png", id: 7, sizeSlug: 'x-->"y' }),
    });
    expect(out).toBe(
      '<!-- wp:image {"id":7,"sizeSlug":"x\\u002d\\u002d\\u003e\\"y","linkDestination":"none"} -->\n' +
        '<figure class="wp-block-image size-x--&gt;&quot;y"><img src="x.png" alt="Alt" class="wp-image-7"/></figure>\n' +
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

describe("code language class", () => {
  it("escapes the fence language inside the class attribute", () => {
    const out = markdownToBlocks('```js"onmouseover="x\ncode\n```', {
      codeLanguage: "class",
    });
    expect(out).toContain('<code class="language-js&quot;onmouseover=&quot;x">');
  });
});

describe("option validation", () => {
  it("throws one RangeError listing every invalid option", () => {
    const convert = () =>
      markdownToBlocks("# Title", {
        headingShift: Number.NaN,
        minHeadingLevel: 0,
        codeLanguage: "colour" as "class",
        unsupported: "keep" as "skip",
      });
    expect(convert).toThrow(RangeError);
    expect(convert).toThrow(
      "invalid options:\n" +
        "  headingShift must be an integer (got NaN)\n" +
        "  minHeadingLevel must be an integer from 1 to 6 (got 0)\n" +
        "  codeLanguage must be 'drop' or 'class' (got \"colour\")\n" +
        "  unsupported must be 'html' or 'skip' (got \"keep\")",
    );
  });

  it("accepts a negative shift with minHeadingLevel 1", () => {
    const out = markdownToBlocks("## Title", { headingShift: -1, minHeadingLevel: 1 });
    expect(out).toContain('<h1 class="wp-block-heading">Title</h1>');
  });

  it("validates parseMarkdownDocument options too", () => {
    expect(() => parseMarkdownDocument("text", { minHeadingLevel: 7 })).toThrow(
      /minHeadingLevel must be an integer from 1 to 6 \(got 7\)/,
    );
  });
});

describe("raw HTML in skip mode", () => {
  it("drops inline HTML as well as block HTML", () => {
    const out = markdownToBlocks("a <b>bold</b> <!-- wp:separator /--> z\n\n<div>block</div>", {
      unsupported: "skip",
    });
    expect(out).toBe("<!-- wp:paragraph -->\n<p>a bold  z</p>\n<!-- /wp:paragraph -->");
  });

  it("keeps inline HTML by default", () => {
    expect(markdownToBlocks("a <kbd>K</kbd>")).toContain("<p>a <kbd>K</kbd></p>");
  });
});

describe("URL scheme policy", () => {
  it("keeps the text but drops the href of unsafe links", () => {
    const md =
      "[direct](javascript:alert(1)) [entity](javascript&#58;alert(2)) [ref][evil] [ok](https://x.test)\n\n" +
      "[evil]: JAVASCRIPT:alert(3)";
    expect(markdownToBlocks(md)).toBe(
      '<!-- wp:paragraph -->\n<p>direct entity ref <a href="https://x.test">ok</a></p>\n<!-- /wp:paragraph -->',
    );
  });

  it("keeps mailto, tel, relative and fragment links", () => {
    const out = markdownToBlocks("[a](mailto:a@x.test) [b](tel:+44) [c](/about) [d](#top)");
    expect(out).toContain('<a href="mailto:a@x.test">a</a> <a href="tel:+44">b</a> <a href="/about">c</a> <a href="#top">d</a>');
  });

  it("drops images with unsafe sources, block and inline", () => {
    expect(markdownToBlocks("![x](javascript:alert(1))")).toBe("");
    expect(markdownToBlocks("![x](data:image/png;base64,AAAA)")).toBe("");
    expect(markdownToBlocks("text ![x](javascript:alert(1)) more")).toContain("<p>text  more</p>");
  });

  it("applies the image policy to resolver-supplied URLs", () => {
    const out = markdownToBlocks("![x](a.png)", {
      resolveImage: () => ({ url: "javascript:alert(1)", id: 3 }),
    });
    expect(out).toBe("");
  });

  it("passes any scheme with urlSchemes 'any'", () => {
    const out = markdownToBlocks("[x](javascript:void(0)) ![i](data:image/png;base64,AA)", {
      urlSchemes: "any",
    });
    expect(out).toContain('<a href="javascript:void(0)">x</a> <img src="data:image/png;base64,AA" alt="i"/>');
  });
});

describe("resolver id validation", () => {
  for (const badId of [0, -1, 1.5, Number.NaN, '1" onerror="x']) {
    it(`throws for id ${JSON.stringify(badId)}, block and inline`, () => {
      const resolveImage = (): ResolvedImage => ({ url: "x.png", id: badId as number });
      expect(() => markdownToBlocks("![a](x.png)", { resolveImage })).toThrow(
        /resolveImage returned an invalid id for "x\.png": expected a positive integer/,
      );
      expect(() => markdownToBlocks("t ![a](x.png)", { resolveImage })).toThrow(RangeError);
    });
  }
});

describe("nesting limit", () => {
  it("throws a RangeError instead of overflowing the stack", () => {
    expect(() => markdownToBlocks(`${">".repeat(3000)} x`)).toThrow(
      "Markdown nests 3002 levels deep; the limit is 200",
    );
  });

  it("accepts nesting up to the limit", () => {
    expect(markdownToBlocks(`${">".repeat(198)} x`)).toContain("<p>x</p>");
    expect(() => markdownToBlocks(`${">".repeat(199)} x`)).toThrow(RangeError);
  });
});

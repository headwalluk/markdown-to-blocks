import { describe, expect, it } from "vitest";
import { escapeAttribute, escapeCode, escapeText } from "../src/escape.js";

describe("escapeText", () => {
  it("escapes & < > and nothing else", () => {
    expect(escapeText('a & b < c > d "q"')).toBe("a &amp; b &lt; c &gt; d \"q\"");
  });

  it("escapes & before < and > (no double-encoding)", () => {
    expect(escapeText("<x>")).toBe("&lt;x&gt;");
    expect(escapeText("&lt;")).toBe("&amp;lt;");
  });

  it("does not double-encode an already-escaped run when applied once", () => {
    // Applied exactly once, "a < b && c > 0" must not become &amp;amp;.
    expect(escapeText("a < b && c > 0")).toBe("a &lt; b &amp;&amp; c &gt; 0");
  });
});

describe("escapeCode", () => {
  it("matches the §5.3 code example", () => {
    expect(escapeCode('if ($a < $b && $c > 0) { echo "<x>"; }')).toBe(
      'if ($a &lt; $b &amp;&amp; $c &gt; 0) { echo "&lt;x&gt;"; }',
    );
  });
});

describe("escapeAttribute", () => {
  it("escapes & and \" for attribute safety", () => {
    expect(escapeAttribute('https://x/?a=1&b=2')).toBe(
      "https://x/?a=1&amp;b=2",
    );
    expect(escapeAttribute('a"b')).toBe("a&quot;b");
  });
});

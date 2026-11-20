import { describe, expect, it } from "vitest";
import { isSafeImageUrl, isSafeLinkUrl, urlScheme } from "../src/url.js";

describe("urlScheme", () => {
  it("reads the scheme the way a browser would", () => {
    expect(urlScheme("HTTPS://example.com")).toBe("https");
    expect(urlScheme("java\tscript:alert(1)")).toBe("javascript");
    expect(urlScheme("java\nscript:alert(1)")).toBe("javascript");
    expect(urlScheme(" \u0001javascript:alert(1)")).toBe("javascript");
  });

  it("treats URLs without a scheme as relative", () => {
    expect(urlScheme("/path/page")).toBeNull();
    expect(urlScheme("#section")).toBeNull();
    expect(urlScheme("//cdn.example.com/x.png")).toBeNull();
    expect(urlScheme("dir/file:name")).toBeNull();
    expect(urlScheme("java%09script:alert(1)")).toBeNull();
  });
});

describe("scheme allowlists", () => {
  it("allows http(s), mailto, tel and relative links only", () => {
    for (const url of ["https://x.test", "http://x.test", "mailto:a@x.test", "tel:+441234", "/about", "#top"]) {
      expect(isSafeLinkUrl(url), url).toBe(true);
    }
    for (const url of ["javascript:alert(1)", "vbscript:x", "data:text/html,x", "file:///etc/passwd"]) {
      expect(isSafeLinkUrl(url), url).toBe(false);
    }
  });

  it("allows http(s) and relative images only", () => {
    expect(isSafeImageUrl("https://x.test/a.png")).toBe(true);
    expect(isSafeImageUrl("a.png")).toBe(true);
    expect(isSafeImageUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeImageUrl("mailto:a@x.test")).toBe(false);
  });
});

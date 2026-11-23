/** URL scheme policy for link `href` and image `src` values (docs/security.md#url-safety). */

const LINK_SCHEMES: readonly string[] = ["http", "https", "mailto", "tel"];
const IMAGE_SCHEMES: readonly string[] = ["http", "https"];

/** Return the lowercased scheme a browser would see in `url`, or null if relative. */
export function urlScheme(url: string): string | null {
  // Browsers drop tab/CR/LF anywhere and trim C0 controls and spaces, so
  // `java\tscript:` and ` javascript:` both resolve to the javascript scheme.
  const normalised = url
    .replace(/[\t\n\r]/g, "")
    // eslint-disable-next-line no-control-regex -- trimming C0 control characters is the point
    .replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(normalised);
  return match?.[1] != null ? match[1].toLowerCase() : null;
}

/** Whether `url` is relative or uses an allowlisted scheme. */
function hasAllowedScheme(url: string, schemes: readonly string[]): boolean {
  const scheme = urlScheme(url);
  return scheme == null || schemes.includes(scheme);
}

/** Whether a link `href` passes the policy: http(s), mailto, tel or relative. */
export function isSafeLinkUrl(url: string): boolean {
  return hasAllowedScheme(url, LINK_SCHEMES);
}

/** Whether an image `src` passes the policy: http(s) or relative. */
export function isSafeImageUrl(url: string): boolean {
  return hasAllowedScheme(url, IMAGE_SCHEMES);
}

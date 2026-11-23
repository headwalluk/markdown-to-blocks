# Images

For developers converting Markdown that contains images.

The converter never touches the network, so it can't upload media. Instead, your agent uploads
each image to the media library (REST `wp/v2/media`) and supplies a `resolveImage` callback:

```ts
import { markdownToBlocks } from "@headwall/markdown-to-blocks";

const html = markdownToBlocks(markdown, {
  resolveImage(src, alt) {
    const media = mediaMap.get(src); // your upload bookkeeping
    if (!media) return undefined;    // → external <img> fallback
    return { url: media.url, id: media.id, sizeSlug: "large", alt };
  },
});
```

- When `resolveImage` returns an object **with an `id`**, you get the attachment shape:
  `wp:image {"id":…,"sizeSlug":…,"linkDestination":"none"}`, a `size-<slug>` figure class, and a
  `wp-image-<id>` class on the `<img>`.
- When it returns `undefined`, you get the **external** fallback: a plain
  `<figure class="wp-block-image">` / `<img>` with no attachment id.
- An `id` must be a positive integer; anything else throws a `RangeError`.
- The final URL, whether from the Markdown or the resolver, is subject to the
  [URL safety](security.md#url-safety) policy.

On the command line there is no resolver, so every image uses the external shape.

## Captions and links

An image's Markdown title becomes its caption, unless the resolver supplies a `caption`:

```markdown
![Floor plan](https://example.com/wp-content/uploads/plan.png "Ground floor, as built")
```

An image wrapped in a link, alone in its paragraph, becomes a linked `core/image`:

```markdown
[![Floor plan](https://example.com/wp-content/uploads/plan-1024x768.png)](https://example.com/wp-content/uploads/plan.png)
```

- When the link points at the image's own file, `linkDestination` is `"media"`: clicking opens
  the full-size image, which is what lightbox plugins and themes look for. Any size WordPress
  generated counts as the same file (`-1024x768`, `-scaled`), as does a relative URL with the
  same path.
- Any other link is `"custom"`.
- A link whose URL fails the [URL safety](security.md#url-safety) policy is dropped, and the
  image renders unlinked.
- A linked image inside a sentence stays inline in its paragraph.

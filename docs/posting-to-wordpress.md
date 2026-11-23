# Posting to WordPress

For anyone sending converted Markdown to a WordPress site.

The converter produces the `content` field; your script owns the REST call. A minimal example
using the REST API with an
[application password](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)
and [`jq`](https://jqlang.github.io/jq/):

```bash
# Pull title/slug from frontmatter and the body as blocks in one shot
DOC=$(md2blocks -i post.md --frontmatter)
TITLE=$(printf '%s' "$DOC" | jq -r '.frontmatter.title')
CONTENT=$(printf '%s' "$DOC" | jq -r '.blocks')

curl -s -X POST "https://example.com/wp-json/wp/v2/posts" \
  -u "USERNAME:APPLICATION_PASSWORD" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg t "$TITLE" --arg c "$CONTENT" \
        '{title: $t, status: "draft", content: $c}')"
```

- Frontmatter fields (title, slug, date…) go into their REST fields, never into `content`.
  See [supported-markdown.md](supported-markdown.md#headings-avoiding-duplicate-titles) for
  keeping the title from appearing twice.
- Upload images first and convert with a `resolveImage` callback, so they become media-library
  images rather than external ones. See [images.md](images.md).
- If the Markdown isn't yours, read [security.md](security.md) before posting it as an
  administrator.

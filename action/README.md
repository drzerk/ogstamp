# og-check

**Catch broken social cards in CI, before a bad link ships.**

A missing or 404-ing `og:image` is invisible in code review and invisible in your
browser. You find out when someone shares your launch post and it renders as a
grey rectangle with a URL under it.

`og-check` fetches your pages in CI, reads their Open Graph and Twitter Card
tags, and fails the build when a card is broken. When a page has no usable
image, the report includes a ready-made one.

```yaml
- uses: drzerk/ogstamp/action@main
  with:
    urls: |
      https://staging.example.com/
      https://staging.example.com/blog/launch
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## What it checks

| Tag | Why it fails the build |
|---|---|
| `og:image` | Missing, unreachable, or serving something that is not an image. The single biggest hit to click-through. |
| `twitter:card` | Missing — X falls back to a small thumbnail instead of the full-width image. |
| `og:title` | Missing with no `<title>` fallback, or too long to survive truncation. |
| `og:description` | Missing with no meta description fallback, or over 200 characters. |

These warn rather than fail: `og:image:width`/`height` (missing, undersized, or
the wrong aspect ratio), `og:image:alt`, `og:url`, `og:type`, `og:site_name`.

Each page gets a 0–100 score and a letter grade. The job summary and the PR
comment carry the full table.

## Full example

```yaml
name: Social cards

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write   # only needed for the PR comment

jobs:
  og-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check social cards on the preview deployment
        uses: drzerk/ogstamp/action@main
        id: og
        with:
          urls: ${{ steps.deploy.outputs.preview-url }}
          fail-on: fail
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - run: echo "Average score ${{ steps.og.outputs.score }}"
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `urls` | *required* | Page URLs, one per line (commas work too). Point these at your preview deployment. |
| `fail-on` | `fail` | `fail` — only blocking issues. `warn` — any finding. `never` — report only. |
| `comment` | `true` | Post a sticky PR comment. Needs `github-token` and `pull-requests: write`. |
| `github-token` | — | Usually `${{ secrets.GITHUB_TOKEN }}`. Without it, the report only goes to the job summary. |
| `api-key` | — | Optional OGStamp key, so generated fix snippets are ready to paste. |
| `ogstamp-url` | `https://ogstamp.drzerk88.workers.dev` | Override for a self-hosted deployment. |
| `max-urls` | `25` | Safety cap per run (1–100). |

## Outputs

| Output | Description |
|---|---|
| `score` | Average score across all checked pages, 0–100. |
| `failures` | Number of pages with at least one blocking issue. |
| `report` | The full report as JSON, for downstream steps. |

## When a page has no card

The report links a rendered replacement you can open straight from the PR — no
account, no signup — plus the tags to paste:

```html
<meta property="og:image" content="https://ogstamp.drzerk88.workers.dev/og?title=...&key=YOUR_KEY" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

That URL is [OGStamp](https://ogstamp.drzerk88.workers.dev), which renders a
1200×630 card per request at the edge. The free tier covers 100 images a month.
`og-check` itself works fine without it — set `fail-on` and ignore the snippet.

## Notes

- **No dependencies, no build step.** One `node20` script, checked in as-is.
- **It only talks to the URLs you give it**, from your own runner. Nothing is
  sent anywhere else; the OGStamp links in the report are generated locally as
  text.
- Pages are fetched with a 15 s timeout and read up to 1 MB — enough for any
  `<head>`, bounded for a hung server.
- The PR comment is sticky: one comment, updated in place.

## Development

```bash
node --test action/test/ogcheck.test.js
```

The parser and scorer in `lib/ogcheck.js` are pure — HTML in, JSON out, no
network — so the whole rule set is testable without fixtures or a live site.

MIT licensed, same as the rest of [OGStamp](https://github.com/drzerk/ogstamp).

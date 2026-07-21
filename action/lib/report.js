// og-check — markdown report rendering.
//
// Split out from index.js so it can be unit-tested without touching the
// network or the runner environment. Everything rendered here originates from
// a third-party page, so escaping is not optional: the output lands in a job
// summary and in a PR comment, both of which render HTML.

'use strict';

const { RECOMMENDED_IMAGE } = require('./ogcheck.js');

const COMMENT_MARKER = '<!-- og-check-report -->';
const ICON = { pass: '✅', warn: '⚠️', fail: '❌' };

/**
 * Neutralise page-controlled text for a markdown table cell: pipes would break
 * out of the table, angle brackets would open a tag, and newlines would end the
 * row. GitHub renders raw HTML in comments, so this is an XSS boundary.
 */
function md(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/[<>]/g, ch => (ch === '<' ? '&lt;' : '&gt;'))
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

/**
 * Escape a value for an HTML attribute. The snippet we hand out is copied
 * verbatim into someone's <head>, and we are the tag-quality tool — so the
 * ampersands between query parameters have to be real entities.
 */
function htmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape a value that will sit inside a markdown link target or an href. */
function mdUrl(value) {
  const url = String(value || '');
  // Only ever emit links we built ourselves against a validated base, but keep
  // the guard so a future caller cannot smuggle in javascript: or a paren.
  if (!/^https?:\/\//i.test(url)) return '';
  return url.replace(/[()\s<>"]/g, encodeURIComponent);
}

/**
 * Build the "here is a working card" URLs for a page whose og:image is missing
 * or broken. The preview URL is keyless and watermarked so it can be opened
 * straight from the PR without an account.
 */
function buildFixSnippet(report, base, apiKey) {
  const { title, description, domain } = report.suggested || {};
  const params = new URLSearchParams();
  params.set('title', title || domain || 'Your page title');
  if (description) params.set('description', description);
  if (domain) params.set('domain', domain);

  const previewUrl = `${base}/demo/og?${params.toString()}`;

  const liveParams = new URLSearchParams(params);
  liveParams.set('key', apiKey || 'YOUR_KEY');
  const liveUrl = `${base}/og?${liveParams.toString()}`;

  return { previewUrl, liveUrl };
}

function renderReport(results, opts = {}) {
  const base = (opts.base || '').replace(/\/+$/, '');
  const apiKey = opts.apiKey || '';
  const lines = [];
  const failed = results.filter(r => r.error || (r.failures && r.failures.length));

  lines.push('## og-check — social card report');
  lines.push('');

  const scored = results.filter(r => !r.error);
  if (scored.length) {
    const avg = Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length);
    lines.push(
      `**${scored.length} page${scored.length === 1 ? '' : 's'} checked · average score ${avg}/100**` +
        (failed.length
          ? ` · **${failed.length} with blocking issues**`
          : ' · no blocking issues')
    );
  } else {
    lines.push('**No page could be checked.**');
  }
  lines.push('');

  for (const result of results) {
    if (result.error) {
      lines.push(`### ❌ ${md(result.url)}`);
      lines.push('');
      lines.push(`Could not be checked: ${md(result.error)}`);
      lines.push('');
      continue;
    }

    const hasFail = result.failures && result.failures.length;
    const hasWarn = result.warnings && result.warnings.length;
    const heading = hasFail ? '❌' : hasWarn ? '⚠️' : '✅';
    lines.push(
      `### ${heading} ${md(result.url)} — ${result.score}/100 (grade ${md(result.grade)})`
    );
    lines.push('');
    lines.push('| | Tag | Finding |');
    lines.push('|---|---|---|');
    for (const check of result.checks) {
      lines.push(
        `| ${ICON[check.status] || ''} | \`${md(check.id)}\` | ${md(check.detail)} |`
      );
    }
    lines.push('');

    // The conversion moment: a page with no usable card gets a working one it
    // can look at immediately, without signing up for anything.
    const imageBroken = result.checks.some(c => c.id === 'og:image' && c.status === 'fail');
    if (imageBroken && base) {
      const { previewUrl, liveUrl } = buildFixSnippet(result, base, apiKey);
      lines.push('<details><summary><b>Fix it — a ready-made card for this page</b></summary>');
      lines.push('');
      lines.push(`[Preview the generated card](${mdUrl(previewUrl)}) — no account needed, watermarked.`);
      lines.push('');
      lines.push('Paste into `<head>`:');
      lines.push('');
      lines.push('```html');
      lines.push(`<meta property="og:image" content="${htmlAttr(liveUrl)}" />`);
      lines.push(`<meta property="og:image:width" content="${RECOMMENDED_IMAGE.width}" />`);
      lines.push(`<meta property="og:image:height" content="${RECOMMENDED_IMAGE.height}" />`);
      lines.push('<meta name="twitter:card" content="summary_large_image" />');
      lines.push('```');
      lines.push('');
      if (!apiKey) {
        lines.push(
          `Replace \`YOUR_KEY\` with a free key from [OGStamp](${mdUrl(base + '/register')}), or set the \`api-key\` input to have it filled in automatically.`
        );
        lines.push('');
      }
      lines.push('</details>');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(
    '<sub>Generated by [og-check](https://github.com/drzerk/ogstamp/tree/main/action) — Open Graph tag checking in CI.</sub>'
  );

  return lines.join('\n');
}

module.exports = { COMMENT_MARKER, ICON, buildFixSnippet, htmlAttr, md, mdUrl, renderReport };

// og-check core — pure Open Graph / Twitter Card parser and scorer.
//
// HTML in, JSON out. Deliberately free of network I/O and of any dependency:
// the caller decides how a page is fetched, which keeps this file trivially
// testable and lets the same logic run in a Cloudflare Worker, in Node, or in
// a GitHub Action runner.
//
// CommonJS on purpose — a GitHub Action runs this file directly with no
// install step, so it must work as-is on a stock node20 runner.

'use strict';

// Open Graph's own recommendation, and what X/LinkedIn/Slack render best.
const RECOMMENDED_IMAGE = { width: 1200, height: 630 };

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  '#x27': "'",
  nbsp: ' ',
};

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, code) => {
    const known = ENTITIES[code.toLowerCase()];
    if (known !== undefined) return known;
    try {
      if (/^#x/i.test(code)) {
        const n = parseInt(code.slice(2), 16);
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
      }
      if (code[0] === '#') {
        const n = parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
      }
    } catch {
      return whole; // out-of-range code point
    }
    return whole;
  });
}

// Meta attributes appear in any order and with either quote style, so this
// reads one named attribute out of a single tag rather than assuming a shape.
function attr(tag, name) {
  const re = new RegExp(
    '\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))',
    'i'
  );
  const m = re.exec(tag);
  if (!m) return undefined;
  const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] || '';
  const clean = decodeEntities(value).trim();
  return clean || undefined;
}

// Values end up in reports, PR comments and (later) HTML. Cap length and strip
// control characters at the boundary so no consumer has to remember to.
function sanitize(value) {
  if (typeof value !== 'string') return undefined;
  // Control characters are stripped at the boundary so no consumer of this
  // report has to remember to do it.
  const clean = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return undefined;
  return clean.length > 300 ? clean.slice(0, 300) + '…' : clean;
}

const META_KEYS = {
  'og:title': 'ogTitle',
  'og:description': 'ogDescription',
  'og:image': 'ogImage',
  'og:image:url': 'ogImage',
  'og:image:secure_url': 'ogImage',
  'og:image:alt': 'ogImageAlt',
  'og:image:width': 'ogImageWidth',
  'og:image:height': 'ogImageHeight',
  'og:url': 'ogUrl',
  'og:type': 'ogType',
  'og:site_name': 'ogSiteName',
  'twitter:card': 'twitterCard',
  'twitter:title': 'twitterTitle',
  'twitter:description': 'twitterDescription',
  'twitter:image': 'twitterImage',
  'twitter:image:src': 'twitterImage',
  'twitter:site': 'twitterSite',
  description: 'description',
};

/**
 * Extract the social meta tags from an HTML document.
 * Only an allowlist of known keys is returned — never raw markup — so this can
 * never be used to echo arbitrary page content back to a caller.
 *
 * @param {string} html
 * @returns {Record<string, string>}
 */
function parseMetaTags(html) {
  if (typeof html !== 'string') return {};

  // Only the <head> matters, and stopping there avoids scanning body content.
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;

  const tags = {};

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head);
  if (titleMatch) {
    const t = sanitize(decodeEntities(titleMatch[1]));
    if (t) tags.title = t;
  }

  const metaTags = head.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const rawKey = attr(tag, 'property') || attr(tag, 'name');
    if (!rawKey) continue;
    const field = META_KEYS[rawKey.toLowerCase()];
    if (!field) continue;
    const content = sanitize(attr(tag, 'content'));
    // First declaration wins, matching how crawlers treat duplicate tags.
    if (content && tags[field] === undefined) tags[field] = content;
  }

  const linkMatch = /<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i.exec(head);
  if (linkMatch) {
    const href = sanitize(attr(linkMatch[0], 'href'));
    if (href) tags.canonical = href;
  }

  return tags;
}

/**
 * Resolve a possibly-relative meta URL against the page URL, exactly as a
 * social crawler would. Returns undefined for anything that is not http(s).
 */
function absolutizeUrl(value, baseUrl) {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return undefined;
    return resolved.toString();
  } catch {
    return undefined;
  }
}

// ─── Checks ───────────────────────────────────────────────────────────────────

const WEIGHTS = { pass: 1, warn: 0.5, fail: 0 };

/**
 * Score the tags. `imageProbe` is optional; pass the result of a HEAD request
 * against tags.ogImage to also catch declared-but-broken images.
 *
 * @param {Record<string,string>} tags
 * @param {{ok:boolean,status?:number,contentType?:string,bytes?:number,error?:string}} [imageProbe]
 */
function buildChecks(tags, imageProbe) {
  const checks = [];
  const add = (id, status, detail) => checks.push({ id, status, detail });

  if (!tags.ogTitle) {
    add('og:title', tags.title ? 'warn' : 'fail',
      tags.title
        ? 'Missing — crawlers fall back to <title>, which is written for Google, not for a shared link.'
        : 'Missing, with no <title> to fall back to. Shares render as a bare URL.');
  } else if (tags.ogTitle.length > 70) {
    add('og:title', 'warn',
      tags.ogTitle.length + ' characters — most platforms truncate around 60–70.');
  } else {
    add('og:title', 'pass', tags.ogTitle.length + ' characters — good length.');
  }

  if (!tags.ogDescription) {
    add('og:description', tags.description ? 'warn' : 'fail',
      tags.description
        ? 'Missing — the meta description is used instead, which is rarely the right copy for a share card.'
        : 'Missing. Share cards render without any supporting text.');
  } else if (tags.ogDescription.length > 200) {
    add('og:description', 'warn',
      tags.ogDescription.length + ' characters — aim for under 200 or it gets clipped.');
  } else {
    add('og:description', 'pass', tags.ogDescription.length + ' characters — good length.');
  }

  // The headline check: a missing or broken og:image is the single biggest
  // click-through loss, and the one nobody notices until a link looks dead.
  if (!tags.ogImage) {
    add('og:image', 'fail',
      'Missing. Every share of this page renders as a text-only link.');
  } else if (imageProbe && imageProbe.ok === false) {
    add('og:image', 'fail',
      imageProbe.error ||
        'The image URL returned HTTP ' + imageProbe.status + '. Crawlers see a broken image.');
  } else if (imageProbe && imageProbe.contentType && !/^image\//i.test(imageProbe.contentType)) {
    add('og:image', 'fail',
      'The URL serves "' + String(imageProbe.contentType).split(';')[0] + '", not an image.');
  } else if (imageProbe && imageProbe.bytes > 5000000) {
    add('og:image', 'warn',
      (imageProbe.bytes / 1000000).toFixed(1) + ' MB — Facebook rejects anything over 8 MB, and this is slow to crawl.');
  } else {
    add('og:image', 'pass', imageProbe ? 'Present and reachable.' : 'Present.');
  }

  const w = Number(tags.ogImageWidth);
  const h = Number(tags.ogImageHeight);
  if (tags.ogImage && (!w || !h)) {
    add('og:image:width/height', 'warn',
      'Not declared. Crawlers must download the image before they can lay out the card, which delays the first share.');
  } else if (w && h) {
    const ratio = w / h;
    const ideal = RECOMMENDED_IMAGE.width / RECOMMENDED_IMAGE.height;
    if (w < 600 || h < 315) {
      add('og:image:width/height', 'warn',
        w + '×' + h + ' is below the 600×315 minimum — X and LinkedIn downgrade it to a small thumbnail.');
    } else if (Math.abs(ratio - ideal) > 0.25) {
      add('og:image:width/height', 'warn',
        w + '×' + h + ' (' + ratio.toFixed(2) + ':1) — cards are cropped to about ' +
        RECOMMENDED_IMAGE.width + '×' + RECOMMENDED_IMAGE.height + ' (1.91:1).');
    } else {
      add('og:image:width/height', 'pass', w + '×' + h + ' — correct aspect ratio.');
    }
  }

  add('og:image:alt', tags.ogImageAlt ? 'pass' : 'warn',
    tags.ogImageAlt
      ? 'Present — screen readers can describe your card.'
      : 'Missing. Screen readers announce the card as an unlabelled image.');

  add('og:url', tags.ogUrl ? 'pass' : 'warn',
    tags.ogUrl
      ? 'Present — engagement consolidates on one canonical address.'
      : 'Missing. Shares of ?utm_source= variants count as separate pages.');

  add('og:type', tags.ogType ? 'pass' : 'warn',
    tags.ogType
      ? 'Set to "' + tags.ogType + '".'
      : 'Missing. Defaults to "website"; articles should declare og:type="article".');

  add('og:site_name', tags.ogSiteName ? 'pass' : 'warn',
    tags.ogSiteName
      ? 'Set to "' + tags.ogSiteName + '".'
      : 'Missing. Your brand name will not appear above the card.');

  if (!tags.twitterCard) {
    add('twitter:card', 'fail',
      'Missing. X renders a small thumbnail instead of the full-width image — set summary_large_image.');
  } else if (tags.twitterCard !== 'summary_large_image' && tags.ogImage) {
    add('twitter:card', 'warn',
      'Set to "' + tags.twitterCard + '". With an image present, summary_large_image gets far more real estate.');
  } else {
    add('twitter:card', 'pass', 'Set to "' + tags.twitterCard + '".');
  }

  return checks;
}

function gradeFor(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function scoreChecks(checks) {
  if (!checks.length) return 0;
  const sum = checks.reduce((acc, c) => acc + (WEIGHTS[c.status] || 0), 0);
  return Math.round((sum / checks.length) * 100);
}

/**
 * Full analysis for one page.
 *
 * @param {object} input
 * @param {string} input.html      raw HTML of the page
 * @param {string} input.url       final URL the HTML was served from
 * @param {object} [input.imageProbe]
 * @returns {object} report
 */
function analyze(input) {
  const { html, url } = input;
  const tags = parseMetaTags(html);

  const ogImage = absolutizeUrl(tags.ogImage, url);
  if (ogImage) tags.ogImage = ogImage;
  const twitterImage = absolutizeUrl(tags.twitterImage, url);
  if (twitterImage) tags.twitterImage = twitterImage;

  const checks = buildChecks(tags, input.imageProbe);
  const score = scoreChecks(checks);

  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  return {
    url,
    tags,
    checks,
    score,
    grade: gradeFor(score),
    failures: checks.filter(c => c.status === 'fail').map(c => c.id),
    warnings: checks.filter(c => c.status === 'warn').map(c => c.id),
    // Best available values for prefilling a generated replacement card.
    suggested: {
      title: tags.ogTitle || tags.title || hostname,
      description: tags.ogDescription || tags.description,
      domain: hostname,
    },
  };
}

module.exports = {
  RECOMMENDED_IMAGE,
  analyze,
  absolutizeUrl,
  buildChecks,
  decodeEntities,
  gradeFor,
  parseMetaTags,
  sanitize,
  scoreChecks,
};

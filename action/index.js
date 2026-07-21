// og-check — GitHub Action entry point.
//
// Runs inside the user's own CI and checks the user's own URLs, so there is no
// server-side fetch of attacker-controlled targets anywhere in this design.
//
// Zero dependencies on purpose: GitHub Actions runs `main:` directly with no
// install step, so everything the toolkit would give us (inputs, outputs, job
// summary, annotations) is implemented against the documented runner
// environment variables instead of pulling in @actions/core.

'use strict';

const fs = require('fs');
const { analyze } = require('./lib/ogcheck.js');
const { COMMENT_MARKER, renderReport } = require('./lib/report.js');

const PAGE_TIMEOUT_MS = 15_000;
const IMAGE_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 1024 * 1024;
const USER_AGENT = 'og-check-action/1.0 (+https://github.com/drzerk/ogstamp)';

// ─── Runner plumbing ──────────────────────────────────────────────────────────

function getInput(name, fallback = '') {
  // The runner uppercases the input name and replaces spaces with underscores,
  // but leaves dashes alone — so `fail-on` arrives as INPUT_FAIL-ON. The
  // underscore spelling is checked too so the action stays callable from a
  // plain `env:` block.
  const upper = name.toUpperCase().replace(/ /g, '_');
  const value =
    process.env['INPUT_' + upper] ?? process.env['INPUT_' + upper.replace(/-/g, '_')];
  return value === undefined || value === '' ? fallback : value.trim();
}

function getBooleanInput(name, fallback = false) {
  const raw = getInput(name).toLowerCase();
  if (!raw) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  // Heredoc syntax — output values may legitimately contain newlines.
  const delimiter = 'ogcheck_' + Math.random().toString(36).slice(2);
  fs.appendFileSync(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function appendSummary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) {
    process.stdout.write(markdown + '\n');
    return;
  }
  fs.appendFileSync(file, markdown + '\n');
}

// Workflow commands must not contain raw newlines or they break the protocol.
function escapeCommand(text) {
  return String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function annotate(level, message) {
  process.stdout.write(`::${level}::${escapeCommand(message)}\n`);
}

// ─── Fetching (the user's own pages, on the user's own runner) ────────────────

async function readCapped(res) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      total += value.byteLength;
      // The <head> is at the top, so a truncated body still parses correctly.
      if (total >= MAX_HTML_BYTES) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  // Note the arrow function: passing Buffer.from directly to map would hand it
  // the index and the array as byteOffset and length, silently truncating.
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}

async function fetchPage(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} — social crawlers would see the same thing.`
    );
  }
  return { html: await readCapped(res), finalUrl: res.url || url };
}

// A declared-but-404 og:image is the most common silent failure: nobody notices
// until a link already looks broken in someone else's timeline.
async function probeImage(imageUrl) {
  try {
    const res = await fetch(imageUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    const len = res.headers.get('content-length');
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type') || undefined,
      bytes: len ? Number(len) : undefined,
    };
  } catch {
    return { ok: false, error: 'The image URL could not be reached.' };
  }
}

// ─── PR comment (sticky: one comment, updated in place) ───────────────────────

async function upsertComment(body, token) {
  const repo = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!repo || !eventPath || !fs.existsSync(eventPath)) return false;

  let event;
  try {
    event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  } catch {
    return false;
  }
  const prNumber = event.pull_request && event.pull_request.number;
  if (!prNumber) return false;

  const api = process.env.GITHUB_API_URL || 'https://api.github.com';
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  };
  const payload = JSON.stringify({ body: `${COMMENT_MARKER}\n${body}` });

  // Reuse our own previous comment so a busy PR does not accumulate reports.
  const listRes = await fetch(
    `${api}/repos/${repo}/issues/${prNumber}/comments?per_page=100`,
    { headers }
  );
  if (listRes.ok) {
    const comments = await listRes.json();
    const mine = Array.isArray(comments)
      ? comments.find(c => c.body && c.body.includes(COMMENT_MARKER))
      : undefined;
    if (mine) {
      const patch = await fetch(`${api}/repos/${repo}/issues/comments/${mine.id}`, {
        method: 'PATCH',
        headers,
        body: payload,
      });
      return patch.ok;
    }
  }

  const post = await fetch(`${api}/repos/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers,
    body: payload,
  });
  return post.ok;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function parseUrls(raw, max) {
  const urls = raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);

  const valid = [];
  for (const candidate of urls) {
    const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    try {
      const parsed = new URL(withScheme);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        valid.push(parsed.toString());
      } else {
        annotate('warning', `Skipping "${candidate}" — only http and https URLs can be checked.`);
      }
    } catch {
      annotate('warning', `Skipping "${candidate}" — not a valid URL.`);
    }
  }

  if (valid.length > max) {
    annotate('warning', `${valid.length} URLs given; checking the first ${max}. Raise max-urls to check more.`);
    return valid.slice(0, max);
  }
  return valid;
}

async function checkOne(url) {
  try {
    const { html, finalUrl } = await fetchPage(url);
    const preliminary = analyze({ html, url: finalUrl });
    const imageProbe = preliminary.tags.ogImage
      ? await probeImage(preliminary.tags.ogImage)
      : undefined;
    // Re-analyze with the probe so og:image scoring reflects reachability.
    return imageProbe ? analyze({ html, url: finalUrl, imageProbe }) : preliminary;
  } catch (err) {
    return {
      url,
      error: err && err.message ? err.message : 'The page could not be loaded.',
      checks: [],
      failures: [],
      warnings: [],
      score: 0,
      grade: 'F',
    };
  }
}

async function main() {
  const urlInput = getInput('urls');
  if (!urlInput) {
    annotate('error', 'No URLs given. Set the `urls` input to at least one page URL.');
    process.exit(1);
  }

  const maxUrls = Math.max(1, Math.min(Number(getInput('max-urls', '25')) || 25, 100));
  const urls = parseUrls(urlInput, maxUrls);
  if (!urls.length) {
    annotate('error', 'None of the given values were usable URLs.');
    process.exit(1);
  }

  const failOn = (getInput('fail-on', 'fail') || 'fail').toLowerCase();
  const base = (getInput('ogstamp-url', 'https://ogstamp.drzerk88.workers.dev') || '').replace(/\/+$/, '');
  const apiKey = getInput('api-key');

  const results = [];
  for (const url of urls) {
    process.stdout.write(`Checking ${url}\n`);
    results.push(await checkOne(url));
  }

  for (const result of results) {
    if (result.error) {
      annotate('error', `${result.url}: ${result.error}`);
      continue;
    }
    for (const check of result.checks) {
      if (check.status === 'fail') annotate('error', `${result.url} — ${check.id}: ${check.detail}`);
      else if (check.status === 'warn') annotate('warning', `${result.url} — ${check.id}: ${check.detail}`);
    }
  }

  const markdown = renderReport(results, { base, apiKey });
  appendSummary(markdown);

  const scored = results.filter(r => !r.error);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length)
    : 0;
  const failureCount = results.filter(r => r.error || r.failures.length).length;
  const warningCount = results.filter(r => !r.error && r.warnings.length).length;

  setOutput('score', String(avgScore));
  setOutput('failures', String(failureCount));
  setOutput('report', JSON.stringify(results));

  const token = getInput('github-token');
  if (getBooleanInput('comment', true) && token) {
    try {
      const posted = await upsertComment(markdown, token);
      if (!posted) {
        process.stdout.write('No PR comment written (not a pull_request event, or no permission).\n');
      }
    } catch (err) {
      annotate('warning', `Could not write the PR comment: ${err.message}`);
    }
  }

  process.stdout.write(`\nAverage score ${avgScore}/100 — ${failureCount} page(s) with blocking issues.\n`);

  if (failOn === 'never') return;
  if (failOn === 'warn' && (failureCount || warningCount)) {
    process.exit(1);
  }
  if (failOn === 'fail' && failureCount) {
    process.exit(1);
  }
}

main().catch(err => {
  annotate('error', `og-check crashed: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});

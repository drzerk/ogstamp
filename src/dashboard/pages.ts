// OGStamp — Dashboard & landing page HTML
// Aesthetic: "Carbon Terminal" — dark developer tool, amber accent, monospace-first

import type { ApiKey, CheckoutUrls } from '../types';
import { checkoutUrl } from '../billing/lemonsqueezy';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      #0A0A0A;
    --surface: #141414;
    --border:  #1F1F1F;
    --divider: #2A2A2A;
    --text-1:  #F5F5F5;
    --text-2:  #A3A3A3;
    --text-3:  #525252;
    --accent:  #F59E0B;
    --accent-dim: #92400E;
    --teal:    #14B8A6;
    --red:     #EF4444;
    --font-mono: 'JetBrains Mono', 'Consolas', monospace;
    --font-sans: 'DM Sans', system-ui, sans-serif;
    --r: 6px;
    --r-lg: 12px;
    --shadow: 0 0 0 1px var(--border);
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.6;
    min-height: 100vh;
    /* Dot-grid background */
    background-image: radial-gradient(circle, #1F1F1F 1px, transparent 1px);
    background-size: 32px 32px;
  }

  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Nav */
  .nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 32px;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .nav-logo {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 18px;
    color: var(--text-1);
    letter-spacing: -0.02em;
  }
  .nav-logo span { color: var(--accent); }
  .nav-links { display: flex; gap: 24px; align-items: center; }
  .nav-links a { color: var(--text-2); font-size: 14px; }
  .nav-links a:hover { color: var(--text-1); text-decoration: none; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--font-mono); font-size: 13px; font-weight: 500;
    padding: 8px 20px; border-radius: var(--r);
    border: none; cursor: pointer; transition: all 0.15s;
    text-decoration: none;
  }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:hover { background: #FBBF24; text-decoration: none; }
  .btn-ghost { background: transparent; color: var(--text-2); border: 1px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }

  /* Container */
  .container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
  .container-wide { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

  /* Hero */
  .hero { padding: 100px 0 72px; text-align: center; position: relative; }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: var(--font-mono); font-size: 12px; color: var(--accent);
    letter-spacing: 0.1em; text-transform: uppercase;
    border: 1px solid var(--accent-dim); border-radius: 100px;
    padding: 4px 14px; margin-bottom: 28px;
  }
  .hero-eyebrow::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
  .hero h1 {
    font-size: clamp(42px, 6vw, 72px);
    font-weight: 700; letter-spacing: -0.04em;
    line-height: 1.05;
    background: linear-gradient(135deg, #F5F5F5 0%, #A3A3A3 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 24px;
  }
  .hero h1 em {
    font-style: normal;
    background: linear-gradient(135deg, var(--accent), #FCD34D);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-sub {
    font-size: 18px; color: var(--text-2); max-width: 560px; margin: 0 auto 40px;
    line-height: 1.65;
  }
  .hero-cta { display: flex; gap: 12px; justify-content: center; }

  /* Section */
  .section { padding: 80px 0; }
  .section-title {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--accent); letter-spacing: 0.12em; text-transform: uppercase;
    margin-bottom: 12px;
  }
  .section-h2 {
    font-size: 36px; font-weight: 700; letter-spacing: -0.025em;
    margin-bottom: 16px; line-height: 1.15;
  }
  .section-sub { font-size: 17px; color: var(--text-2); max-width: 480px; line-height: 1.6; }

  /* Code block */
  .code-block {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); overflow: hidden; margin-top: 32px;
  }
  .code-block-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px; border-bottom: 1px solid var(--border);
  }
  .code-block-lang {
    font-family: var(--font-mono); font-size: 12px; color: var(--text-3);
    letter-spacing: 0.06em;
  }
  .code-block-dots { display: flex; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-red { background: #FF5F57; }
  .dot-yellow { background: #FEBC2E; }
  .dot-green { background: #28C840; }
  .code-block pre {
    padding: 24px 20px; font-family: var(--font-mono); font-size: 13px;
    line-height: 1.7; color: var(--text-1); overflow-x: auto;
    white-space: pre;
  }
  .c-comment { color: var(--text-3); }
  .c-key { color: var(--teal); }
  .c-val { color: #86EFAC; }
  .c-str { color: #FCD34D; }
  .c-url { color: var(--accent); }

  /* API params table */
  .params-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  .params-table th, .params-table td {
    padding: 12px 16px; text-align: left;
    border-bottom: 1px solid var(--border); font-size: 14px;
  }
  .params-table th {
    font-family: var(--font-mono); font-size: 11px; color: var(--text-3);
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .params-table td:first-child { font-family: var(--font-mono); color: var(--teal); }
  .params-table .required {
    font-family: var(--font-mono); font-size: 10px; color: var(--accent);
    border: 1px solid var(--accent-dim); border-radius: 3px; padding: 1px 6px;
  }
  .params-table .optional {
    font-family: var(--font-mono); font-size: 10px; color: var(--text-3);
    border: 1px solid var(--border); border-radius: 3px; padding: 1px 6px;
  }

  /* Pricing */
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 48px; }
  .pricing-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 32px;
    display: flex; flex-direction: column;
    transition: border-color 0.2s;
  }
  .pricing-card:hover { border-color: var(--accent); }
  .pricing-card.featured {
    border-color: var(--accent);
    background: linear-gradient(180deg, #1C1400 0%, var(--surface) 100%);
  }
  .pricing-tier {
    font-family: var(--font-mono); font-size: 11px; color: var(--text-3);
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px;
  }
  .pricing-tier-featured { color: var(--accent); }
  .pricing-price {
    font-size: 40px; font-weight: 700; letter-spacing: -0.03em;
    margin-bottom: 4px; line-height: 1;
  }
  .pricing-period { font-size: 14px; color: var(--text-2); margin-bottom: 24px; }
  .pricing-limit {
    font-family: var(--font-mono); font-size: 13px; color: var(--text-2);
    margin-bottom: 20px; padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .pricing-features { list-style: none; flex: 1; }
  .pricing-features li {
    font-size: 14px; color: var(--text-2); padding: 6px 0;
    display: flex; gap: 8px; align-items: flex-start;
  }
  .pricing-features li::before { content: '→'; color: var(--accent); flex-shrink: 0; }
  .pricing-features li.dim::before { color: var(--text-3); }
  .pricing-features li.dim { color: var(--text-3); }
  .pricing-cta { margin-top: 28px; }

  /* Features grid */
  .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 48px; }
  .feature-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 28px;
  }
  .feature-icon {
    font-family: var(--font-mono); font-size: 20px; color: var(--accent);
    margin-bottom: 16px; display: block;
  }
  .feature-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
  .feature-card p { font-size: 14px; color: var(--text-2); line-height: 1.6; }

  /* Dashboard */
  .dash-layout { padding: 40px 0 80px; }
  .dash-header { margin-bottom: 40px; }
  .dash-header h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.02em; }
  .dash-header p { font-size: 14px; color: var(--text-2); }

  .dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
  .dash-grid-full { grid-column: 1 / -1; }

  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 28px;
  }
  .card-title {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--text-3); letter-spacing: 0.1em; text-transform: uppercase;
    margin-bottom: 20px;
  }

  /* API key display */
  .api-key-display {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--r); padding: 12px 16px;
    font-family: var(--font-mono); font-size: 13px; color: var(--text-2);
    flex: 1;
  }
  .api-key-display .key-val { flex: 1; word-break: break-all; }
  .api-key-row { display: flex; gap: 8px; align-items: stretch; }

  /* Usage meter */
  .usage-bar-wrap {
    background: var(--bg); border-radius: 100px;
    height: 6px; margin: 12px 0 8px; overflow: hidden;
  }
  .usage-bar {
    height: 100%; border-radius: 100px;
    background: var(--accent);
    transition: width 0.6s ease;
  }
  .usage-bar.warn { background: #F97316; }
  .usage-bar.full { background: var(--red); }
  .usage-meta { display: flex; justify-content: space-between; font-size: 13px; }
  .usage-count { font-family: var(--font-mono); font-size: 28px; font-weight: 700; }
  .usage-limit { font-size: 13px; color: var(--text-3); }

  /* Tier badge */
  .tier-badge {
    display: inline-flex; align-items: center;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 3px 10px; border-radius: 100px;
  }
  .tier-free { background: #1C1C1C; color: var(--text-3); border: 1px solid var(--border); }
  .tier-pro { background: #1C1400; color: var(--accent); border: 1px solid var(--accent-dim); }
  .tier-business { background: #0A2A2A; color: var(--teal); border: 1px solid #115E59; }

  /* Register form */
  .form-group { margin-bottom: 20px; }
  .form-label { display: block; font-family: var(--font-mono); font-size: 12px; color: var(--text-2); margin-bottom: 8px; letter-spacing: 0.06em; }
  .form-input {
    width: 100%; padding: 12px 16px;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--r); font-family: var(--font-mono);
    font-size: 14px; color: var(--text-1);
    outline: none; transition: border-color 0.15s;
  }
  .form-input:focus { border-color: var(--accent); }
  .form-hint { font-size: 12px; color: var(--text-3); margin-top: 6px; }

  /* Alert */
  .alert { padding: 14px 18px; border-radius: var(--r); font-size: 14px; margin-bottom: 20px; }
  .alert-error { background: #1C0A0A; border: 1px solid #7F1D1D; color: #FCA5A5; }
  .alert-success { background: #052E16; border: 1px solid #14532D; color: #86EFAC; }

  /* Footer */
  .footer {
    border-top: 1px solid var(--border); padding: 32px 0;
    text-align: center; font-size: 13px; color: var(--text-3);
    font-family: var(--font-mono);
  }

  /* Playground — live OG compiler */
  .playground { margin-top: 56px; text-align: left; }
  .pg-eyebrow {
    display: flex; align-items: center; gap: 10px; justify-content: center;
    font-family: var(--font-mono); font-size: 12px; color: var(--text-3);
    letter-spacing: 0.08em; margin-bottom: 18px;
  }
  .pg-eyebrow b { color: var(--accent); font-weight: 500; }
  .pg-live-dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--teal);
    box-shadow: 0 0 0 0 rgba(20,184,166,0.6);
    animation: pgpulse 1.8s ease-out infinite;
  }
  @keyframes pgpulse {
    0% { box-shadow: 0 0 0 0 rgba(20,184,166,0.5); }
    70% { box-shadow: 0 0 0 8px rgba(20,184,166,0); }
    100% { box-shadow: 0 0 0 0 rgba(20,184,166,0); }
  }
  .pg-panel {
    display: grid; grid-template-columns: 320px 1fr;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); overflow: hidden;
    box-shadow: 0 0 0 1px var(--border), 0 40px 90px rgba(0,0,0,0.55);
  }
  .pg-controls { border-right: 1px solid var(--border); background: var(--surface); }
  .pg-controls-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
  }
  .pg-controls-head .code-block-dots { display: flex; gap: 6px; }
  .pg-controls-head span {
    font-family: var(--font-mono); font-size: 11px; color: var(--text-3); letter-spacing: 0.04em;
  }
  .pg-fields { padding: 20px 18px; display: flex; flex-direction: column; gap: 16px; }
  .pg-field label {
    display: block; font-family: var(--font-mono); font-size: 10px; color: var(--text-3);
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 7px;
  }
  .pg-field input[type=text] {
    width: 100%; padding: 9px 12px; background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--r);
    font-family: var(--font-mono); font-size: 13px; color: var(--text-1);
    outline: none; transition: border-color 0.15s;
  }
  .pg-field input[type=text]:focus { border-color: var(--accent); }
  .pg-seg {
    display: flex; gap: 3px; background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--r); padding: 3px;
  }
  .pg-seg button {
    flex: 1; font-family: var(--font-mono); font-size: 11px; color: var(--text-2);
    background: transparent; border: none; border-radius: 4px; padding: 7px 4px;
    cursor: pointer; transition: all 0.15s; text-transform: lowercase;
  }
  .pg-seg button:hover { color: var(--text-1); }
  .pg-seg button.active { background: var(--accent); color: #000; font-weight: 500; }
  .pg-preview { display: flex; flex-direction: column; background: var(--bg); min-width: 0; }
  .pg-browser-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .pg-browser-url {
    flex: 1; font-family: var(--font-mono); font-size: 11px; color: var(--text-3);
    background: var(--surface); border: 1px solid var(--border); border-radius: 100px;
    padding: 4px 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pg-browser-url b { color: var(--text-2); font-weight: 400; }
  .pg-img-wrap { position: relative; aspect-ratio: 1200 / 630; background: var(--surface); }
  .pg-img-wrap img { width: 100%; height: 100%; display: block; object-fit: cover; transition: opacity 0.35s ease; }
  .pg-img-wrap.loading img { opacity: 0.25; }
  .pg-spinner {
    position: absolute; top: 50%; left: 50%; width: 26px; height: 26px;
    margin: -13px 0 0 -13px; border: 2px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%;
    opacity: 0; transition: opacity 0.2s; animation: pgspin 0.7s linear infinite;
  }
  .pg-img-wrap.loading .pg-spinner { opacity: 1; }
  @keyframes pgspin { to { transform: rotate(360deg); } }
  .pg-url {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-top: 1px solid var(--border); flex-shrink: 0;
  }
  .pg-url code {
    flex: 1; font-family: var(--font-mono); font-size: 12px; color: var(--accent);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .pg-copy {
    background: var(--surface); border: 1px solid var(--border); color: var(--text-2);
    font-family: var(--font-mono); font-size: 11px; padding: 6px 13px;
    border-radius: var(--r); cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .pg-copy:hover { border-color: var(--accent); color: var(--accent); }
  .pg-cta {
    text-align: center; margin-top: 22px; font-size: 14px; color: var(--text-2);
    font-family: var(--font-sans);
  }
  .pg-cta a { font-weight: 500; }
  .pg-cta .pg-wm { color: var(--text-3); font-family: var(--font-mono); font-size: 12px; }

  @media (max-width: 768px) {
    .pricing-grid { grid-template-columns: 1fr; }
    .features-grid { grid-template-columns: 1fr; }
    .dash-grid { grid-template-columns: 1fr; }
    .hero h1 { font-size: 36px; }
    .pg-panel { grid-template-columns: 1fr; }
    .pg-controls { border-right: none; border-bottom: 1px solid var(--border); }
  }
`;

// Canonical public origin, used when a page has no request host to work from.
const DEFAULT_HOST = 'ogstamp.drzerk88.workers.dev';
const DEFAULT_DESCRIPTION =
  'Generate Open Graph images via API. Hosted on the Cloudflare edge, cached globally, delivered in milliseconds.';

export interface PageMeta {
  description?: string;
  host?: string;
  path?: string;
  /** Params for the share card this page advertises, rendered by our own API. */
  card?: { title: string; description?: string; domain?: string; tag?: string };
  noindex?: boolean;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Full Open Graph + Twitter Card block. We sell OG images, so our own share
 * card is generated by our own public endpoint — the keyless `/demo/og` route,
 * whose watermark is simply our logo on our own site.
 */
function socialTags(pageTitle: string, meta: PageMeta): string {
  const host = meta.host || DEFAULT_HOST;
  const origin = `https://${host}`;
  const canonical = origin + (meta.path ?? '/');
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const card = meta.card ?? { title: pageTitle };

  const params = new URLSearchParams();
  params.set('title', card.title);
  if (card.description) params.set('description', card.description);
  params.set('domain', card.domain ?? host);
  if (card.tag) params.set('tag', card.tag);
  params.set('theme', 'dark');
  const image = `${origin}/demo/og?${params.toString()}`;

  const title = `${pageTitle} — OGStamp`;

  return `
  <link rel="canonical" href="${escapeAttr(canonical)}" />
  <meta name="description" content="${escapeAttr(description)}" />${
    meta.noindex ? '\n  <meta name="robots" content="noindex" />' : ''
  }
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:image" content="${escapeAttr(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeAttr(card.title)}" />
  <meta property="og:url" content="${escapeAttr(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OGStamp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(image)}" />`;
}

function layout(title: string, body: string, meta: PageMeta = {}, extraHead = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — OGStamp</title>${socialTags(title, meta)}
  <style>${CSS}</style>
  ${extraHead}
</head>
<body>
  ${body}
</body>
</html>`;
}

function nav(_activePath = '/'): string {
  return `
  <nav class="nav">
    <a class="nav-logo" href="/"><span>OG</span>Stamp</a>
    <div class="nav-links">
      <a href="/#how-it-works">Docs</a>
      <a href="/#pricing">Pricing</a>
      <a href="/register" class="btn btn-primary">Get API Key →</a>
    </div>
  </nav>`;
}

function footer(): string {
  return `
  <footer class="footer">
    <div class="container">
      OGStamp — OG images at the edge. Built with ♥ on Cloudflare Workers.
    </div>
  </footer>`;
}

export function landingPage(host: string, checkout: CheckoutUrls = {}): string {
  void host; // used in template strings below

  const body = `
  ${nav('/')}

  <!-- Hero -->
  <section class="hero">
    <div class="container">
      <div class="hero-eyebrow">Open Graph Images API</div>
      <h1>OG images for every URL,<br/><em>delivered at the edge</em></h1>
      <p class="hero-sub">
        One API call. Instant PNG. Cached globally on Cloudflare CDN.
        Stop hand-coding OG templates — let OGStamp generate them dynamically.
      </p>
      <div class="hero-cta">
        <a href="/register" class="btn btn-primary" style="font-size:15px;padding:12px 28px;">Get Free API Key</a>
        <a href="/#how-it-works" class="btn btn-ghost" style="font-size:15px;padding:12px 28px;">View Docs</a>
      </div>

      <!-- Interactive playground -->
      <div class="playground" id="playground">
        <div class="pg-eyebrow">
          <span class="pg-live-dot"></span>
          <span>Type anything — the social card <b>renders live</b>, no signup</span>
        </div>
        <div class="pg-panel">
          <div class="pg-controls">
            <div class="pg-controls-head">
              <div class="code-block-dots">
                <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
              </div>
              <span>og-image.config</span>
            </div>
            <div class="pg-fields">
              <div class="pg-field">
                <label for="pg-title">Title</label>
                <input type="text" id="pg-title" data-pg="title" maxlength="100"
                  value="How to Build a Billion-Dollar API" placeholder="Your page title" />
              </div>
              <div class="pg-field">
                <label for="pg-desc">Description</label>
                <input type="text" id="pg-desc" data-pg="description" maxlength="200"
                  value="A deep dive into developer tools that compound" placeholder="Optional subtitle" />
              </div>
              <div class="pg-field">
                <label for="pg-domain">Domain</label>
                <input type="text" id="pg-domain" data-pg="domain" maxlength="100"
                  value="myblog.dev" placeholder="yoursite.com" />
              </div>
              <div class="pg-field">
                <label>Theme</label>
                <div class="pg-seg" data-seg-for="theme">
                  <button type="button" data-val="dark" class="active">dark</button>
                  <button type="button" data-val="light">light</button>
                </div>
              </div>
              <div class="pg-field">
                <label>Template</label>
                <div class="pg-seg" data-seg-for="template">
                  <button type="button" data-val="default" class="active">default</button>
                  <button type="button" data-val="blog">blog</button>
                  <button type="button" data-val="article">article</button>
                </div>
              </div>
            </div>
          </div>
          <div class="pg-preview">
            <div class="pg-browser-bar">
              <div class="code-block-dots">
                <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
              </div>
              <div class="pg-browser-url"><b>https://</b><span id="pg-bar-url">myblog.dev</span></div>
            </div>
            <div class="pg-img-wrap" id="pg-img-wrap">
              <img id="pg-img" alt="Live OG image preview"
                src="/demo/og?title=How%20to%20Build%20a%20Billion-Dollar%20API&amp;description=A%20deep%20dive%20into%20developer%20tools%20that%20compound&amp;domain=myblog.dev&amp;theme=dark&amp;template=default" />
              <div class="pg-spinner"></div>
            </div>
            <div class="pg-url">
              <code id="pg-real-url">GET /og?title=How+to+Build+a+Billion-Dollar+API&amp;key=YOUR_KEY</code>
              <button class="pg-copy" id="pg-copy">Copy URL</button>
            </div>
          </div>
        </div>
        <p class="pg-cta">
          <span class="pg-wm">↑ live preview carries a watermark.</span>
          <a href="/register">Get a free key</a> to drop it — 100 images/month, no card.
        </p>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="section" id="how-it-works">
    <div class="container">
      <p class="section-title">API Reference</p>
      <h2 class="section-h2">One endpoint, infinite images</h2>
      <p class="section-sub">
        Send a GET request. Get a PNG back. Cache it in your CDN. Done.
      </p>

      <div class="code-block" style="margin-top:36px;">
        <div class="code-block-header">
          <div class="code-block-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <span class="code-block-lang">HTTP GET</span>
        </div>
        <pre><span class="c-url">GET https://${host}/og</span>
  <span class="c-comment">  ?title=</span><span class="c-str">Your Page Title Here</span>
  <span class="c-comment">  &amp;description=</span><span class="c-str">Optional subtitle or excerpt</span>
  <span class="c-comment">  &amp;domain=</span><span class="c-str">yourdomain.com</span>
  <span class="c-comment">  &amp;author=</span><span class="c-str">Jane Doe</span>
  <span class="c-comment">  &amp;template=</span><span class="c-str">default</span>  <span class="c-comment"># default | blog | article</span>
  <span class="c-comment">  &amp;theme=</span><span class="c-str">dark</span>      <span class="c-comment"># dark | light</span>
  <span class="c-comment">  &amp;tag=</span><span class="c-str">Tutorial</span>
  <span class="c-comment">  &amp;key=</span><span class="c-str">sk_your_api_key</span>

<span class="c-comment">← 200 OK  Content-Type: image/png  X-Cache: MISS</span></pre>
      </div>

      <h3 style="font-size:18px;font-weight:600;margin:48px 0 0;letter-spacing:-0.01em;">Parameters</h3>
      <table class="params-table">
        <thead>
          <tr>
            <th>Param</th><th>Type</th><th>Required</th><th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>title</td><td>string</td><td><span class="required">required</span></td><td>Page title — the main headline (max 120 chars)</td></tr>
          <tr><td>key</td><td>string</td><td><span class="required">required</span></td><td>Your API key (free tier = 100 images/month)</td></tr>
          <tr><td>description</td><td>string</td><td><span class="optional">optional</span></td><td>Subtitle or page excerpt (max 200 chars)</td></tr>
          <tr><td>domain</td><td>string</td><td><span class="optional">optional</span></td><td>Your domain shown as source label</td></tr>
          <tr><td>author</td><td>string</td><td><span class="optional">optional</span></td><td>Author name shown in footer</td></tr>
          <tr><td>template</td><td>enum</td><td><span class="optional">optional</span></td><td><code>default</code> | <code>blog</code> | <code>article</code></td></tr>
          <tr><td>theme</td><td>enum</td><td><span class="optional">optional</span></td><td><code>dark</code> (default) | <code>light</code></td></tr>
          <tr><td>tag</td><td>string</td><td><span class="optional">optional</span></td><td>Category label shown as pill (e.g. "Tutorial")</td></tr>
        </tbody>
      </table>

      <h3 style="font-size:18px;font-weight:600;margin:48px 0 20px;letter-spacing:-0.01em;">Use in HTML</h3>
      <div class="code-block">
        <div class="code-block-header">
          <div class="code-block-dots">
            <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
          </div>
          <span class="code-block-lang">HTML meta tags</span>
        </div>
        <pre><span class="c-comment">&lt;!-- Drop in &lt;head&gt; --&gt;</span>
<span class="c-key">&lt;meta</span> <span class="c-val">property=</span><span class="c-str">"og:image"</span>
      <span class="c-val">content=</span><span class="c-str">"https://${host}/og?title=My+Post+Title&amp;key=YOUR_KEY"</span> <span class="c-key">/&gt;</span>
<span class="c-key">&lt;meta</span> <span class="c-val">property=</span><span class="c-str">"og:image:width"</span>  <span class="c-val">content=</span><span class="c-str">"1200"</span> <span class="c-key">/&gt;</span>
<span class="c-key">&lt;meta</span> <span class="c-val">property=</span><span class="c-str">"og:image:height"</span> <span class="c-val">content=</span><span class="c-str">"630"</span>  <span class="c-key">/&gt;</span>
<span class="c-key">&lt;meta</span> <span class="c-val">name=</span><span class="c-str">"twitter:card"</span>    <span class="c-val">content=</span><span class="c-str">"summary_large_image"</span> <span class="c-key">/&gt;</span>
<span class="c-key">&lt;meta</span> <span class="c-val">name=</span><span class="c-str">"twitter:image"</span>   <span class="c-val">content=</span><span class="c-str">"https://${host}/og?title=My+Post+Title&amp;key=YOUR_KEY"</span> <span class="c-key">/&gt;</span></pre>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="section" style="padding-top:0;">
    <div class="container">
      <p class="section-title">Why OGStamp</p>
      <h2 class="section-h2">Built for production, priced for teams</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-icon">⚡</span>
          <h3>Edge-cached globally</h3>
          <p>Images are generated once and stored on Cloudflare R2. Subsequent requests hit the cache in under 50ms worldwide.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🎨</span>
          <h3>3 templates out of the box</h3>
          <p>Default, Blog, and Article templates — dark and light variants. No design work needed.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🔑</span>
          <h3>Instant API key</h3>
          <p>Sign up with email, get a key immediately. 100 images free, no credit card required.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">📊</span>
          <h3>Usage dashboard</h3>
          <p>Track how many images you've generated, reset date, and tier status in a clean developer dashboard.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section class="section" id="pricing">
    <div class="container">
      <p class="section-title">Pricing</p>
      <h2 class="section-h2">Start free. Scale as you publish.</h2>
      <div class="pricing-grid">

        <div class="pricing-card">
          <p class="pricing-tier">Free</p>
          <p class="pricing-price">$0</p>
          <p class="pricing-period">forever</p>
          <p class="pricing-limit">100 images / month</p>
          <ul class="pricing-features">
            <li>3 templates (dark + light)</li>
            <li>R2 global cache</li>
            <li>API key + dashboard</li>
            <li class="dim">OGStamp watermark</li>
            <li class="dim">No custom fonts</li>
          </ul>
          <div class="pricing-cta">
            <a href="/register" class="btn btn-ghost" style="width:100%;">Get started →</a>
          </div>
        </div>

        <div class="pricing-card featured">
          <p class="pricing-tier pricing-tier-featured">⚡ Pro — most popular</p>
          <p class="pricing-price" style="color:var(--accent);">$19</p>
          <p class="pricing-period">per month</p>
          <p class="pricing-limit" style="color:var(--accent);">10,000 images / month</p>
          <ul class="pricing-features">
            <li>Everything in Free</li>
            <li>No watermark</li>
            <li>Custom font upload</li>
            <li>Usage analytics</li>
            <li>Priority support</li>
          </ul>
          <div class="pricing-cta">
            ${
              checkout.pro
                ? `<a href="${checkout.pro}" class="btn btn-primary" style="width:100%;">Start Pro →</a>`
                : `<a href="/register?tier=pro" class="btn btn-primary" style="width:100%;">Start Pro →</a>`
            }
          </div>
        </div>

        <div class="pricing-card">
          <p class="pricing-tier">Business</p>
          <p class="pricing-price">$49</p>
          <p class="pricing-period">per month</p>
          <p class="pricing-limit">100,000 images / month</p>
          <ul class="pricing-features">
            <li>Everything in Pro</li>
            <li>Custom domain (CNAME)</li>
            <li>Team access (3 seats)</li>
            <li>White-label (no branding)</li>
            <li>SLA + priority queue</li>
          </ul>
          <div class="pricing-cta">
            ${
              checkout.business
                ? `<a href="${checkout.business}" class="btn btn-ghost" style="width:100%;">Start Business →</a>`
                : `<a href="mailto:drzerk88@googlemail.com" class="btn btn-ghost" style="width:100%;">Contact us →</a>`
            }
          </div>
        </div>

      </div>
    </div>
  </section>

  ${footer()}

  <script>
    // Copy to clipboard helper
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy || '');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });

    // Interactive playground — live demo render
    (function () {
      var img = document.getElementById('pg-img');
      var wrap = document.getElementById('pg-img-wrap');
      var realUrl = document.getElementById('pg-real-url');
      var barUrl = document.getElementById('pg-bar-url');
      var copyBtn = document.getElementById('pg-copy');
      if (!img || !wrap) return;

      var state = {
        title: 'How to Build a Billion-Dollar API',
        description: 'A deep dive into developer tools that compound',
        domain: 'myblog.dev',
        theme: 'dark',
        template: 'default'
      };

      function demoUrl() {
        var p = new URLSearchParams();
        p.set('title', state.title || 'Your Page Title Here');
        if (state.description) p.set('description', state.description);
        if (state.domain) p.set('domain', state.domain);
        p.set('theme', state.theme);
        p.set('template', state.template);
        return '/demo/og?' + p.toString();
      }

      function realQs() {
        var p = new URLSearchParams();
        p.set('title', state.title || 'Your Page Title Here');
        if (state.description) p.set('description', state.description);
        if (state.domain) p.set('domain', state.domain);
        if (state.theme === 'light') p.set('theme', 'light');
        if (state.template !== 'default') p.set('template', state.template);
        p.set('key', 'YOUR_KEY');
        return p.toString();
      }

      var timer;
      function schedule() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          wrap.classList.add('loading');
          img.src = demoUrl();
          if (realUrl) realUrl.textContent = 'GET /og?' + realQs();
          if (barUrl) barUrl.textContent = state.domain || 'yoursite.com';
        }, 350);
      }

      img.addEventListener('load', function () { wrap.classList.remove('loading'); });
      img.addEventListener('error', function () { wrap.classList.remove('loading'); });

      document.querySelectorAll('[data-pg]').forEach(function (el) {
        el.addEventListener('input', function () {
          state[el.getAttribute('data-pg')] = el.value;
          schedule();
        });
      });

      document.querySelectorAll('.pg-seg').forEach(function (seg) {
        seg.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          state[seg.getAttribute('data-seg-for')] = b.getAttribute('data-val');
          schedule();
        });
      });

      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          navigator.clipboard.writeText(location.origin + '/og?' + realQs());
          var o = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(function () { copyBtn.textContent = o; }, 1500);
        });
      }

      // Keep the SSR'd query-string line in sync without forcing an image reload.
      if (realUrl) realUrl.textContent = 'GET /og?' + realQs();
    })();
  </script>`;

  return layout('Generate OG images at the edge', body, {
    host,
    path: '/',
    card: {
      title: 'OG images for every URL, delivered at the edge',
      description: 'One API call. Instant PNG. Cached globally on Cloudflare.',
      domain: host,
      tag: 'API',
    },
  });
}

export function registerPage(error?: string, tier?: string, billingLive = false): string {
  const body = `
  ${nav()}
  <section class="section">
    <div class="container" style="max-width:480px;">
      <p class="section-title">Get API Key</p>
      <h1 class="section-h2">Start generating</h1>
      <p class="section-sub" style="margin-bottom:32px;">Enter your email to receive your API key instantly. No password. No credit card for free tier.</p>

      ${error ? `<div class="alert alert-error">${error}</div>` : ''}
      ${
        tier && tier !== 'free'
          ? billingLive
            ? `<div class="card" style="margin-bottom:16px;padding:14px 16px;font-size:13px;color:var(--text-2);">⚡ Every new key starts on the <strong>Free</strong> tier — upgrade to Pro from your dashboard right after signup.</div>`
            : `<div class="card" style="margin-bottom:16px;padding:14px 16px;font-size:13px;color:var(--text-2);">⚡ Pro &amp; Business checkout launches soon — every new key currently starts on the <strong>Free</strong> tier (100 images/month).</div>`
          : ''
      }

      <div class="card">
        <form method="POST" action="/register">
          <input type="hidden" name="tier" value="free" />
          <div class="form-group">
            <label class="form-label" for="email">EMAIL ADDRESS</label>
            <input class="form-input" type="email" name="email" id="email" placeholder="you@example.com" required autocomplete="email" />
            <p class="form-hint">Your API key will be displayed immediately after registration.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="keyname">KEY NAME (optional)</label>
            <input class="form-input" type="text" name="keyname" id="keyname" placeholder="production" />
            <p class="form-hint">Give this key a label to identify it later.</p>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;font-size:15px;">
            Create API Key →
          </button>
        </form>
      </div>

      <p style="font-size:13px;color:var(--text-3);margin-top:20px;text-align:center;">
        Already have a key? <a href="/dashboard">View your dashboard</a>
      </p>
    </div>
  </section>
  ${footer()}`;

  return layout('Get API Key', body, {
    path: '/register',
    description: 'Create a free OGStamp API key — 100 images a month, no credit card.',
    card: { title: 'Get a free OGStamp API key', description: '100 images a month, no credit card' },
  });
}

export function keyCreatedPage(rawKey: string, email: string, tier: string, host: string): string {
  const body = `
  ${nav()}
  <section class="section">
    <div class="container" style="max-width:600px;">
      <div class="alert alert-success">
        ✓ API key created for ${email}
      </div>
      <p class="section-title">Your API Key</p>
      <h1 class="section-h2">Save this key now</h1>
      <p class="section-sub" style="margin-bottom:32px;">
        This is the only time you'll see the full key. Copy it and store it securely.
      </p>

      <div class="card">
        <p class="card-title">API KEY — ${tier.toUpperCase()}</p>
        <div class="api-key-row">
          <div class="api-key-display">
            <span class="key-val" id="api-key">${rawKey}</span>
          </div>
          <button class="btn btn-primary" data-copy="${rawKey}" style="white-space:nowrap;">Copy</button>
        </div>
        <p style="font-size:12px;color:var(--text-3);margin-top:12px;font-family:var(--font-mono);">
          Free tier: 100 images/month · Resets monthly · ${tier === 'pro' ? '10,000 images' : 'upgrade anytime'}
        </p>
      </div>

      <div class="code-block" style="margin-top:32px;">
        <div class="code-block-header">
          <div class="code-block-dots">
            <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
          </div>
          <span class="code-block-lang">Quick start</span>
        </div>
        <pre><span class="c-comment"># Test your key</span>
<span class="c-key">curl</span> <span class="c-str">"https://${host}/og?title=Hello+World&amp;key=${rawKey}"</span> \
  <span class="c-val">--output</span> og.png && <span class="c-key">open</span> og.png</pre>
      </div>

      <div style="margin-top:32px;display:flex;gap:12px;">
        <a href="/dashboard?key=${rawKey}" class="btn btn-primary">Open Dashboard →</a>
        <a href="/#how-it-works" class="btn btn-ghost">Read the docs</a>
      </div>
    </div>
  </section>
  ${footer()}
  <script>
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.copy || '');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });
  </script>`;

  return layout('API Key Created', body, { host, path: '/register', noindex: true });
}

export function dashboardPage(
  key: ApiKey,
  recentCount: number,
  host: string,
  ownerEmail?: string,
  checkout: CheckoutUrls = {}
): string {
  const pct = Math.round((key.usage_count / key.monthly_limit) * 100);
  const barClass = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
  const resetDate = new Date(key.usage_reset_at);
  const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const tierBadge = `<span class="tier-badge tier-${key.tier}">${key.tier}</span>`;

  const body = `
  ${nav()}
  <div class="container">
    <div class="dash-layout">
      <div class="dash-header">
        <h1>Dashboard ${tierBadge}</h1>
        <p>API key: <code style="font-family:var(--font-mono);font-size:13px;color:var(--text-2);">${key.key_prefix}••••••••••••••••••••</code></p>
      </div>

      <div class="dash-grid">

        <!-- Usage card -->
        <div class="card">
          <p class="card-title">Usage This Month</p>
          <div class="usage-count">${key.usage_count.toLocaleString()}</div>
          <p class="usage-limit">of ${key.monthly_limit.toLocaleString()} images</p>
          <div class="usage-bar-wrap">
            <div class="usage-bar ${barClass}" style="width:${Math.min(pct, 100)}%"></div>
          </div>
          <div class="usage-meta">
            <span style="color:var(--text-3);font-size:13px;">${pct}% used</span>
            <span style="color:var(--text-3);font-size:13px;">Resets ${nextReset}</span>
          </div>
          ${
            key.tier === 'free'
              ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
                   <p style="font-size:13px;color:var(--text-2);">Need more?</p>
                   <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
                   ${
                     checkout.pro
                       ? `<a href="${checkoutUrl(checkout.pro, { userId: key.user_id, email: ownerEmail })}" class="btn btn-primary">Upgrade to Pro — $19/mo →</a>`
                       : `<a href="/register?tier=pro" class="btn btn-primary">Upgrade to Pro — $19/mo →</a>`
                   }
                   ${
                     checkout.business
                       ? `<a href="${checkoutUrl(checkout.business, { userId: key.user_id, email: ownerEmail })}" class="btn btn-ghost">Business — $49/mo →</a>`
                       : ''
                   }
                   </div>
                 </div>`
              : ''
          }
        </div>

        <!-- Stats sidebar -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card">
            <p class="card-title">Recent Generations</p>
            <p style="font-size:32px;font-weight:700;font-family:var(--font-mono);">${recentCount}</p>
            <p style="font-size:13px;color:var(--text-3);margin-top:4px;">in last 24h</p>
          </div>
          <div class="card">
            <p class="card-title">Cache Hit Rate</p>
            <p style="font-size:32px;font-weight:700;font-family:var(--font-mono);color:var(--teal);">—</p>
            <p style="font-size:13px;color:var(--text-3);margin-top:4px;">available in Pro</p>
          </div>
        </div>

        <!-- Quick start code -->
        <div class="card dash-grid-full">
          <p class="card-title">Quick Start</p>
          <div class="code-block">
            <div class="code-block-header">
              <div class="code-block-dots">
                <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
              </div>
              <span class="code-block-lang">HTML / meta tags</span>
            </div>
            <pre><span class="c-key">&lt;meta</span> <span class="c-val">property=</span><span class="c-str">"og:image"</span>
      <span class="c-val">content=</span><span class="c-str">"https://${host}/og?title=YOUR_TITLE&amp;key=${key.key_prefix}..."</span> <span class="c-key">/&gt;</span></pre>
          </div>
          <div class="code-block" style="margin-top:12px;">
            <div class="code-block-header">
              <div class="code-block-dots">
                <div class="dot dot-red"></div><div class="dot dot-yellow"></div><div class="dot dot-green"></div>
              </div>
              <span class="code-block-lang">cURL test</span>
            </div>
            <pre><span class="c-key">curl</span> <span class="c-str">"https://${host}/og?title=My+Blog+Post&amp;domain=myblog.com&amp;key=${key.key_prefix}..."</span> \
  <span class="c-val">--output</span> og.png && <span class="c-key">open</span> og.png</pre>
          </div>
        </div>

      </div>
    </div>
  </div>
  ${footer()}`;

  return layout('Dashboard', body, { host, path: '/dashboard', noindex: true });
}

export function errorPage(code: number, message: string): string {
  const body = `
  ${nav()}
  <section class="section">
    <div class="container" style="text-align:center;max-width:480px;">
      <p style="font-family:var(--font-mono);font-size:80px;font-weight:700;color:var(--border);line-height:1;">${code}</p>
      <h1 style="font-size:24px;margin:16px 0 12px;">${message}</h1>
      <p style="color:var(--text-2);margin-bottom:32px;">Something went wrong. Try again or check the docs.</p>
      <a href="/" class="btn btn-ghost">← Back to home</a>
    </div>
  </section>
  ${footer()}`;

  return layout(`${code} Error`, body, { noindex: true });
}

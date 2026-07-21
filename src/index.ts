// OGStamp — Main Cloudflare Worker
// Routes: GET /og (image gen), GET / (landing), GET/POST /register, GET /dashboard

import { Hono } from 'hono';
import { generateOGImage, buildCacheKey } from './og/render';
import {
  landingPage,
  registerPage,
  keyCreatedPage,
  dashboardPage,
  errorPage,
} from './dashboard/pages';
import type { ApiKey, CheckoutUrls, Env, OGParams, Tier } from './types';
import {
  GLOBAL_DAILY_RENDER_CAP,
  GLOBAL_DAILY_SIGNUP_CAP,
  MAX_KEYS_PER_USER,
  TIER_LIMITS,
} from './types';
import {
  applyLSEvent,
  verifyLSSignature,
  type LSWebhookPayload,
} from './billing/lemonsqueezy';

const app = new Hono<{ Bindings: Env }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'sk_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// Validate an API key from request and return the DB row, or null
async function resolveApiKey(
  db: D1Database,
  rawKey: string | null
): Promise<ApiKey | null> {
  if (!rawKey) return null;
  const hash = await sha256(rawKey);
  const row = await db
    .prepare('SELECT * FROM api_keys WHERE key_hash = ?')
    .bind(hash)
    .first<ApiKey>();
  return row ?? null;
}

// Reset monthly usage if billing month rolled over
async function maybeResetUsage(db: D1Database, key: ApiKey): Promise<ApiKey> {
  const resetAt = new Date(key.usage_reset_at);
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (resetAt < thisMonth) {
    const newResetAt = thisMonth.toISOString();
    await db
      .prepare(
        'UPDATE api_keys SET usage_count = 0, usage_reset_at = ? WHERE id = ?'
      )
      .bind(newResetAt, key.id)
      .run();
    return { ...key, usage_count: 0, usage_reset_at: newResetAt };
  }
  return key;
}

// ── Global daily counters ─────────────────────────────────────────────────────
// One row per UTC day, three columns. These back the denial-of-wallet brakes and
// keep the fetch:render ratio measurable now that hits no longer write events.

type CounterColumn = 'renders' | 'hits' | 'signups';

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Seconds until the counters roll over at 00:00 UTC — used for Retry-After.
function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

// One statement, upsert. Cheap enough to run on the cache-hit path.
// Column name comes from a closed union, never from user input.
function bumpDailyCounter(db: D1Database, column: CounterColumn) {
  return db
    .prepare(
      `INSERT INTO daily_counters (day, ${column}) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET ${column} = ${column} + 1`
    )
    .bind(utcDay());
}

async function readDailyCounter(
  db: D1Database,
  column: CounterColumn
): Promise<number> {
  const row = await db
    .prepare(`SELECT ${column} AS n FROM daily_counters WHERE day = ?`)
    .bind(utcDay())
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// Record a render: bump the key's monthly usage, log the event, bump the global
// render counter. Renders only — a cache hit is the cheapest operation in the
// system and no longer pays for three D1 row writes, nor counts against quota.
async function recordUsage(
  db: D1Database,
  key: ApiKey,
  template: string
): Promise<void> {
  const eventId = crypto.randomUUID();
  await db.batch([
    db
      .prepare('UPDATE api_keys SET usage_count = usage_count + 1 WHERE id = ?')
      .bind(key.id),
    db
      .prepare(
        'INSERT INTO usage_events (id, api_key_id, template, cache_hit) VALUES (?, ?, ?, 0)'
      )
      .bind(eventId, key.id, template),
    bumpDailyCounter(db, 'renders'),
  ]);
}

function checkoutUrls(env: Env): CheckoutUrls {
  return {
    pro: env.LS_CHECKOUT_URL_PRO,
    business: env.LS_CHECKOUT_URL_BUSINESS,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Landing page
app.get('/', c => {
  const host = new URL(c.req.url).host;
  return htmlResponse(landingPage(host, checkoutUrls(c.env)));
});

// ── OG image generation ────────────────────────────────────────────────────────
app.get('/og', async c => {
  const q = c.req.query();
  const rawKey = q['key'] ?? null;

  // Validate required param
  const title = (q['title'] ?? '').trim().slice(0, 120);
  if (!title) {
    return c.json({ error: 'title parameter is required' }, 400);
  }

  // Resolve API key (required)
  if (!rawKey) {
    return c.json({ error: 'key parameter is required. Get a free key at /register' }, 401);
  }
  let apiKey = await resolveApiKey(c.env.DB, rawKey);
  if (!apiKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Reset usage if month rolled
  apiKey = await maybeResetUsage(c.env.DB, apiKey);

  // Check rate limit. The quota meters renders (cache misses), not deliveries —
  // a cached image is free to serve, so it is free to fetch.
  if (apiKey.usage_count >= apiKey.monthly_limit) {
    return c.json(
      {
        error: 'Monthly render limit reached',
        tier: apiKey.tier,
        limit: apiKey.monthly_limit,
        upgrade_url: '/register?tier=pro',
      },
      429
    );
  }

  const params: OGParams = {
    title,
    description: (q['description'] ?? '').trim().slice(0, 200) || undefined,
    domain: (q['domain'] ?? '').trim().slice(0, 100) || undefined,
    author: (q['author'] ?? '').trim().slice(0, 80) || undefined,
    tag: (q['tag'] ?? '').trim().slice(0, 40) || undefined,
    theme: (q['theme'] === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    template: (['blog', 'article'].includes(q['template'] ?? '')
      ? q['template']
      : 'default') as OGParams['template'],
  };

  // No watermark on any authenticated key, free included. A watermark on a
  // production-visible asset is a disqualification, not a trial restriction —
  // nobody ships someone else's logo on their own share cards. /demo/og keeps
  // its watermark; that is the one viral surface and it stays as it is.
  const watermark = false;
  const cacheKey = await buildCacheKey(params, watermark);
  const r2Key = `og/${cacheKey}.png`;

  // ── R2 cache lookup ──
  const cached = await c.env.OG_CACHE.get(r2Key);
  if (cached) {
    // Cache hit — serve the stored PNG. No usage_count bump, no usage_event:
    // this path costs one R2 read and must stay that cheap. A single aggregate
    // counter write keeps the fetch:render ratio observable for unit economics.
    c.executionCtx.waitUntil(bumpDailyCounter(c.env.DB, 'hits').run());
    const imageData = await cached.arrayBuffer();
    return new Response(imageData, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'X-Cache': 'HIT',
        'X-OGStamp-Tier': apiKey.tier,
      },
    });
  }

  // ── Global daily render cap ──
  // Denial-of-wallet killswitch, read only here so the hit path stays lean.
  // Free tier only: a paying customer must never be blocked by free-tier abuse.
  if (apiKey.tier === 'free') {
    const rendersToday = await readDailyCounter(c.env.DB, 'renders');
    if (rendersToday >= GLOBAL_DAILY_RENDER_CAP) {
      return c.json(
        {
          error:
            'Free-tier render capacity for today is exhausted. Cached images still serve normally; new renders resume at 00:00 UTC.',
          daily_cap: GLOBAL_DAILY_RENDER_CAP,
          upgrade_url: '/register?tier=pro',
        },
        503,
        { 'Retry-After': String(secondsUntilUtcMidnight()) }
      );
    }
  }

  // ── Generate image ──
  const imageResponse = await generateOGImage(params, watermark);
  const imageBuffer = await imageResponse.arrayBuffer();

  // Store in R2 (fire-and-forget, don't block response)
  c.executionCtx.waitUntil(
    c.env.OG_CACHE.put(r2Key, imageBuffer.slice(0), {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: { tier: apiKey.tier, template: params.template ?? 'default' },
    })
  );

  // Record the render (also fire-and-forget after we have the image)
  c.executionCtx.waitUntil(
    recordUsage(c.env.DB, apiKey, params.template ?? 'default')
  );

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Cache': 'MISS',
      'X-OGStamp-Tier': apiKey.tier,
    },
  });
});

// ── Public demo render (keyless, always watermarked) ─────────────────────────
// Powers the landing-page hero + interactive playground so a visitor can try
// OGStamp before signing up. Always watermarked, input-capped, R2-cached, and
// writes NOTHING to D1 — so it can never be abused as a free unwatermarked API.
// Missing/blank title falls back to a placeholder so the preview never 4xx's.
app.get('/demo/og', async c => {
  const q = c.req.query();

  const params: OGParams = {
    title: ((q['title'] ?? '').trim() || 'Your Page Title Here').slice(0, 100),
    description: (q['description'] ?? '').trim().slice(0, 200) || undefined,
    domain: (q['domain'] ?? '').trim().slice(0, 100) || undefined,
    tag: (q['tag'] ?? '').trim().slice(0, 40) || undefined,
    theme: (q['theme'] === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    template: (['blog', 'article'].includes(q['template'] ?? '')
      ? q['template']
      : 'default') as OGParams['template'],
  };

  // Demo images are always watermarked; cache under a dedicated prefix.
  const cacheKey = await buildCacheKey(params, true);
  const r2Key = `demo/${cacheKey}.png`;

  const cached = await c.env.OG_CACHE.get(r2Key);
  if (cached) {
    const imageData = await cached.arrayBuffer();
    return new Response(imageData, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'X-Cache': 'HIT',
        'X-OGStamp-Demo': '1',
      },
    });
  }

  const imageResponse = await generateOGImage(params, true);
  const imageBuffer = await imageResponse.arrayBuffer();

  c.executionCtx.waitUntil(
    c.env.OG_CACHE.put(r2Key, imageBuffer.slice(0), {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: { demo: '1', template: params.template ?? 'default' },
    })
  );

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Cache': 'MISS',
      'X-OGStamp-Demo': '1',
    },
  });
});

// ── Registration ──────────────────────────────────────────────────────────────
app.get('/register', c => {
  const tier = c.req.query('tier');
  return htmlResponse(registerPage(undefined, tier, !!c.env.LS_CHECKOUT_URL_PRO));
});

app.post('/register', async c => {
  // IP rate limit first — cheapest possible rejection, touches no storage.
  // The binding is optional by design: `wrangler dev` without it must still
  // boot, so a missing limiter degrades to "no IP limit", never to a crash.
  //
  // ⚠️ MEASURED NON-ENFORCING IN PRODUCTION (Cycle 12). The binding is declared
  // correctly and wrangler reports it at deploy ("3 requests/60s"), but 10
  // sequential POSTs from one IP inside ~2 minutes were all admitted; every 429
  // observed came from the per-user key cap below, not from here. Cause not
  // established — plausibly Free-plan gating, as with `[limits] cpu_ms`.
  // Kept because it costs nothing and is correct if the platform starts
  // enforcing, but it must NOT be counted as a guard. What actually bounds
  // spend is GLOBAL_DAILY_RENDER_CAP (verified: 503 + Retry-After) plus the
  // key cap (verified) and the signup cap. Re-test before relying on this.
  const limiter = c.env.REGISTER_LIMITER;
  if (limiter) {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const { success } = await limiter.limit({ key: ip });
    if (!success) {
      return htmlResponse(
        registerPage('Too many signup attempts from this address. Wait a minute and try again.'),
        429
      );
    }
  }

  let email: string, keyname: string, tier: string;
  try {
    const form = await c.req.formData();
    email = (form.get('email') as string ?? '').trim().toLowerCase();
    keyname = (form.get('keyname') as string ?? '').trim() || 'default';
    tier = (form.get('tier') as string ?? 'free').trim();
  } catch {
    return htmlResponse(registerPage('Invalid form data'), 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return htmlResponse(registerPage('Please enter a valid email address', tier), 400);
  }

  // Global daily signup cap — the same denial-of-wallet brake as renders.
  const signupsToday = await readDailyCounter(c.env.DB, 'signups');
  if (signupsToday >= GLOBAL_DAILY_SIGNUP_CAP) {
    return htmlResponse(
      registerPage('New signups are paused for today. Please try again after 00:00 UTC.', tier),
      503
    );
  }

  // Paid tiers have no payment flow yet — every self-serve key starts on free.
  // Upgrades happen via manual DB update until billing is wired up.
  const safeTier: Tier = 'free';

  // Upsert user
  const userId = crypto.randomUUID();
  await c.env.DB
    .prepare(
      'INSERT INTO users (id, email) VALUES (?, ?) ON CONFLICT(email) DO NOTHING'
    )
    .bind(userId, email)
    .run();

  const user = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();
  if (!user) {
    return htmlResponse(registerPage('Database error — please try again'), 500);
  }

  // Cap keys per user. `users` already dedupes on email, but api_keys was
  // unbounded — one address could mint unlimited keys, each with a full quota,
  // which made the monthly limit per key instead of per human. This closes it.
  const keyCount = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM api_keys WHERE user_id = ?')
    .bind(user.id)
    .first<{ cnt: number }>();
  if ((keyCount?.cnt ?? 0) >= MAX_KEYS_PER_USER) {
    return htmlResponse(
      registerPage(
        `This email already has ${MAX_KEYS_PER_USER} API keys, which is the maximum. ` +
          `View or reuse them from your <a href="/dashboard">dashboard</a>.`,
        tier
      ),
      429
    );
  }

  // Generate API key
  const rawKey = generateRawKey();
  const keyHash = await sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 12);
  const keyId = crypto.randomUUID();
  const resetAt = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthlyLimit = TIER_LIMITS[safeTier];

  await c.env.DB
    .prepare(
      `INSERT INTO api_keys
         (id, user_id, name, key_prefix, key_hash, tier, monthly_limit, usage_reset_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(keyId, user.id, keyname, keyPrefix, keyHash, safeTier, monthlyLimit, resetAt)
    .run();

  // Awaited, not fire-and-forget: signups are rare and the counter is a guard,
  // so an accurate count matters more than the few ms it costs.
  await bumpDailyCounter(c.env.DB, 'signups').run();

  return htmlResponse(keyCreatedPage(rawKey, email, safeTier, new URL(c.req.url).host));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.get('/dashboard', async c => {
  const rawKey = c.req.query('key');
  if (!rawKey) {
    return htmlResponse(registerPage('Enter your API key or create a new one below'), 400);
  }

  const apiKey = await resolveApiKey(c.env.DB, rawKey);
  if (!apiKey) {
    return htmlResponse(errorPage(404, 'API key not found'), 404);
  }

  const refreshed = await maybeResetUsage(c.env.DB, apiKey);

  // Count recent events (last 24h)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await c.env.DB
    .prepare(
      'SELECT COUNT(*) as cnt FROM usage_events WHERE api_key_id = ? AND generated_at > ?'
    )
    .bind(refreshed.id, yesterday)
    .first<{ cnt: number }>();

  const owner = await c.env.DB
    .prepare('SELECT email FROM users WHERE id = ?')
    .bind(refreshed.user_id)
    .first<{ email: string }>();

  return htmlResponse(
    dashboardPage(
      refreshed,
      recent?.cnt ?? 0,
      new URL(c.req.url).host,
      owner?.email,
      checkoutUrls(c.env)
    )
  );
});

// ── Billing webhooks ──────────────────────────────────────────────────────────
app.post('/webhooks/lemonsqueezy', async c => {
  const secret = c.env.LS_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }

  // Signature covers the raw body — read it before parsing.
  const rawBody = await c.req.text();
  const signature = c.req.header('X-Signature') ?? '';
  if (!(await verifyLSSignature(rawBody, signature, secret))) {
    console.warn('lemonsqueezy webhook rejected: invalid signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let payload: LSWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = await applyLSEvent(c.env.DB, payload);
  if (result.status === 'ignored') {
    console.log(`lemonsqueezy webhook ignored: ${result.event} — ${result.detail}`);
  }
  return c.json(result);
});

// ── Health / ops ──────────────────────────────────────────────────────────────
app.get('/health', c => c.json({ ok: true, ts: new Date().toISOString() }));

// 404 fallback
app.notFound(_c => htmlResponse(errorPage(404, 'Page not found'), 404));
app.onError((err, _c) => {
  console.error('Unhandled error:', err);
  return htmlResponse(errorPage(500, 'Internal server error'), 500);
});

export default app;

// OGStamp — shared types

export type Tier = 'free' | 'pro' | 'business';

// Quota is denominated in *renders* (cache misses), not delivered requests.
// Cache hits are free to serve and no longer count — see recordUsage() callers.
export const TIER_LIMITS: Record<Tier, number> = {
  free: 1_000,
  pro: 10_000,
  business: 100_000,
};

// ── Abuse guards (Cycle 11) ───────────────────────────────────────────────────
// A 1,000-render free tier is only safe because the quota binds per *human*.
// Before this, `users` deduped on email but `api_keys` was unbounded per user —
// one address could mint unlimited keys, each with a full quota.
export const MAX_KEYS_PER_USER = 3;

// Global daily ceilings. Denial-of-wallet brakes, not product limits: they exist
// so a single bad actor cannot run up an R2/D1 bill overnight. Paid tiers are
// exempt from the render cap — customers never pay for free-tier abuse.
export const GLOBAL_DAILY_RENDER_CAP = 5_000;

// Lowered 200 → 50 in Cycle 12, after the IP rate limiter on POST /register was
// measured NOT to enforce (see the note in index.ts). This counter is now the
// only working brake on bulk key minting, so it has to be sized like one.
// 50/day is still ~10x any plausible legitimate day-one demand at 0 users;
// raise it the moment real signups approach it.
export const GLOBAL_DAILY_SIGNUP_CAP = 50;

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  tier: Tier;
  monthly_limit: number;
  usage_count: number;
  usage_reset_at: string;
  created_at: string;
}

export interface OGParams {
  title: string;
  description?: string;
  theme?: 'dark' | 'light';
  template?: 'default' | 'blog' | 'article';
  author?: string;
  domain?: string;
  tag?: string;
}

export interface Env {
  DB: D1Database;
  OG_CACHE: R2Bucket;
  ENVIRONMENT: string;
  AUTH_SECRET?: string;
  // Billing (all optional — upgrade UI and webhook stay dormant until set)
  LS_WEBHOOK_SECRET?: string;
  LS_CHECKOUT_URL_PRO?: string;
  LS_CHECKOUT_URL_BUSINESS?: string;
  // Cloudflare native rate limiter (see [[ratelimits]] in wrangler.toml).
  // Optional on purpose: `wrangler dev` without the binding must still boot —
  // callers degrade to "no IP limit" rather than crashing.
  REGISTER_LIMITER?: RateLimiter;
}

// Shape of Cloudflare's rate-limit binding, per
// https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Hosted checkout URLs, present only once billing is configured
export interface CheckoutUrls {
  pro?: string;
  business?: string;
}

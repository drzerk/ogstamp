// OGStamp — Lemon Squeezy billing webhook (Phase 1 of docs/cfo/2026-07-21-billing-decision.md)
// Checkout itself is a hosted Lemon Squeezy URL; the worker only flips tiers on
// verified webhook events. No payment data ever touches this code.

import type { Tier } from '../types';
import { TIER_LIMITS } from '../types';

const UPGRADE_EVENTS = new Set(['subscription_created', 'subscription_payment_success']);
const DOWNGRADE_EVENTS = new Set(['subscription_cancelled', 'subscription_expired']);

export interface LSWebhookPayload {
  meta?: {
    event_name?: string;
    // Set by us via checkout[custom][user_id] on the checkout URL — primary join key.
    custom_data?: { user_id?: string };
  };
  data?: {
    attributes?: {
      user_email?: string;
      product_name?: string;
      variant_name?: string;
    };
  };
}

export interface LSEventResult {
  status: 'ok' | 'ignored';
  event: string;
  detail: string;
}

// Lemon Squeezy signs the raw request body with HMAC-SHA256 (hex) in X-Signature.
export async function verifyLSSignature(
  rawBody: string,
  signatureHex: string,
  secret: string
): Promise<boolean> {
  if (!signatureHex) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
  const expected = Array.from(mac)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const provided = signatureHex.toLowerCase();
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

// "business" must be checked before "pro" — a variant named "Business Pro Plan"
// would otherwise map to the cheaper tier.
function tierFromPayload(payload: LSWebhookPayload): Tier | null {
  const name = [
    payload.data?.attributes?.variant_name ?? '',
    payload.data?.attributes?.product_name ?? '',
  ]
    .join(' ')
    .toLowerCase();
  if (name.includes('business')) return 'business';
  if (name.includes('pro')) return 'pro';
  return null;
}

async function resolveUserId(
  db: D1Database,
  payload: LSWebhookPayload
): Promise<string | null> {
  const customUserId = payload.meta?.custom_data?.user_id;
  if (customUserId) {
    const row = await db
      .prepare('SELECT id FROM users WHERE id = ?')
      .bind(customUserId)
      .first<{ id: string }>();
    if (row) return row.id;
  }
  const email = (payload.data?.attributes?.user_email ?? '').trim().toLowerCase();
  if (email) {
    const row = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string }>();
    if (row) return row.id;
  }
  return null;
}

export async function applyLSEvent(
  db: D1Database,
  payload: LSWebhookPayload
): Promise<LSEventResult> {
  const event = payload.meta?.event_name ?? '(missing event_name)';
  const isUpgrade = UPGRADE_EVENTS.has(event);
  const isDowngrade = DOWNGRADE_EVENTS.has(event);
  if (!isUpgrade && !isDowngrade) {
    return { status: 'ignored', event, detail: 'event not handled' };
  }

  const targetTier: Tier | null = isDowngrade ? 'free' : tierFromPayload(payload);
  if (!targetTier) {
    return { status: 'ignored', event, detail: 'no tier match in variant/product name' };
  }

  const userId = await resolveUserId(db, payload);
  if (!userId) {
    // Paying customer without an OGStamp account (checkout email ≠ registered
    // email and no custom user_id). Surfaces in the LS webhook log for manual fix.
    return { status: 'ignored', event, detail: 'no matching user' };
  }

  await db
    .prepare('UPDATE api_keys SET tier = ?, monthly_limit = ? WHERE user_id = ?')
    .bind(targetTier, TIER_LIMITS[targetTier], userId)
    .run();

  return { status: 'ok', event, detail: `user ${userId} -> ${targetTier}` };
}

// Append checkout[custom][user_id] / checkout[email] to a hosted checkout URL
// so the webhook can join back to the right user (email is fallback only).
export function checkoutUrl(
  base: string,
  opts: { userId?: string; email?: string } = {}
): string {
  const params: string[] = [];
  if (opts.userId) params.push(`checkout[custom][user_id]=${encodeURIComponent(opts.userId)}`);
  if (opts.email) params.push(`checkout[email]=${encodeURIComponent(opts.email)}`);
  if (!params.length) return base;
  return base + (base.includes('?') ? '&' : '?') + params.join('&');
}

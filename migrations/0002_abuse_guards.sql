-- OGStamp D1 Schema
-- Migration 0002: abuse guards + free-tier repricing (Cycle 11)
--
-- 0001 is already applied in production, so nothing in it is edited here;
-- everything this migration needs is added or backfilled forward.

-- Global daily counters. One row per UTC day (`YYYY-MM-DD`).
--   renders — cache misses actually rendered (the metered, costly operation)
--   hits    — cache hits served from R2 (free to serve, tracked only so we can
--             keep measuring the fetch:render ratio the unit economics rest on)
--   signups — new API keys minted
CREATE TABLE IF NOT EXISTS daily_counters (
  day     TEXT PRIMARY KEY,
  renders INTEGER NOT NULL DEFAULT 0,
  hits    INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0
);

-- Lift existing free keys from the old 100/month ceiling to 1,000 renders/month.
-- Scoped to rows still carrying the 0001 default so any manual override survives.
UPDATE api_keys SET monthly_limit = 1000 WHERE tier = 'free' AND monthly_limit = 100;

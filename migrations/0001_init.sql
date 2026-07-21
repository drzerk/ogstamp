-- SnapOG D1 Schema
-- Migration 0001: initial tables

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT 'default',
  -- First 12 chars of the raw key, for display only (safe to store)
  key_prefix      TEXT NOT NULL,
  -- SHA-256 hex of the full raw key — used for lookup
  key_hash        TEXT UNIQUE NOT NULL,
  tier            TEXT NOT NULL DEFAULT 'free',   -- free | pro | business
  monthly_limit   INTEGER NOT NULL DEFAULT 100,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  -- ISO date of the first day of the current billing month
  usage_reset_at  TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

CREATE TABLE IF NOT EXISTS usage_events (
  id           TEXT PRIMARY KEY,
  api_key_id   TEXT NOT NULL,
  template     TEXT NOT NULL DEFAULT 'default',
  cache_hit    INTEGER NOT NULL DEFAULT 0,   -- 0 = miss, 1 = hit
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE INDEX IF NOT EXISTS idx_usage_key ON usage_events(api_key_id);

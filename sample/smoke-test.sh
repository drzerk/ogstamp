#!/usr/bin/env bash
# SnapOG — quick API test (requires a running dev server)
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"
KEY="${API_KEY:-}"

echo "=== SnapOG API smoke test ==="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: health
echo "[1] GET /health"
curl -sf "$BASE_URL/health" | head -c 200
echo ""

# Test 2: OG image (requires key)
if [ -n "$KEY" ]; then
  echo "[2] GET /og?title=Hello+World&key=$KEY"
  OUT=$(mktemp /tmp/snapog-test-XXXX.png)
  HTTP_CODE=$(curl -sf -o "$OUT" -w "%{http_code}" \
    "$BASE_URL/og?title=Hello+World&description=Test+description&domain=test.com&key=$KEY")
  echo "  HTTP $HTTP_CODE — saved to $OUT"
  SIZE=$(wc -c < "$OUT")
  echo "  PNG size: $SIZE bytes"
  if [ "$SIZE" -gt 1000 ]; then
    echo "  ✓ PNG looks valid"
  else
    echo "  ✗ PNG too small — check output"
    exit 1
  fi
else
  echo "[2] Skipped (API_KEY not set)"
fi

echo ""
echo "✓ Smoke test passed"

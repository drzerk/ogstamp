// OGStamp — OG image renderer
// Uses workers-og (Satori + resvg-wasm, CF Workers compatible)

import { ImageResponse } from 'workers-og';
import { buildElement } from './templates';
import type { OGParams } from '../types';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export async function generateOGImage(
  params: OGParams,
  watermark: boolean
): Promise<Response> {
  const element = buildElement(params, watermark);

  const response = new ImageResponse(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
  });

  return response;
}

// Bump whenever template rendering changes so stale R2 objects are bypassed.
const RENDER_VERSION = 2;

// Build a deterministic cache key from OG params
export async function buildCacheKey(params: OGParams, watermark: boolean): Promise<string> {
  const sorted = JSON.stringify(
    Object.fromEntries(
      Object.entries({ ...params, watermark, v: RENDER_VERSION }).sort(([a], [b]) => a.localeCompare(b))
    )
  );
  const encoder = new TextEncoder();
  const data = encoder.encode(sorted);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

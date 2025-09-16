// /src/services/cttBulk.js

// Extracts RT…PT-like codes from any string
const codeRe = /\b([A-Z]{2}\d{7,15}[A-Z]{2})\b/;

/**
 * collectOrderTracks
 * - Fetches /api/orders once
 * - Builds an object: { [orderId]: { track_url, code|null } }
 * - No extra network calls
 */
export async function collectOrderTracks({
  apiBase,       // e.g. "https://api-new-six.vercel.app"
  limit = 100,   // how many orders to fetch
  includeMissing = false, // include orders without an RT code
} = {}) {
  if (!apiBase) throw new Error("collectOrderTracks: apiBase is required");
  const BASE = apiBase.replace(/\/$/, "");

  // 1) pull orders
  const res = await fetch(`${BASE}/api/orders?limit=${limit}`);
  if (!res.ok) throw new Error(`orders HTTP ${res.status}`);
  const { items = [] } = await res.json();

  // 2) build id → { track_url, code } map (no extra fetches)
  const out = {};
  for (const o of items) {
    const track_url = o?.track_url ?? null;

    // try to find an RT code from several possible fields
    const haystack = [o?.track_url, o?.trackId, o?.tracking, o?.track]
      .filter(Boolean)
      .join(" ");
    const match = haystack.match(codeRe);
    const code = match ? match[1] : null;

    if (code || includeMissing) {
      out[o.id] = { track_url, code };
    }
  }

  return out;
}

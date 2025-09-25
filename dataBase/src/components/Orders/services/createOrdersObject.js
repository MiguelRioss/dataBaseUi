// /src/services/createOrdersObject.js

/**
 * Create ORDERS OBJECT
 * 1) start with {}
 * 2) fetch /api/orders
 * 3) keep only orders that HAVE a track_url
 * 4) return { [orderId]: { track_url: string, flags: [] } }
 */
export async function createOrdersObject({
  apiBase,        // e.g. "https://api-new-six.vercel.app"
  limit = 100,    // how many orders to fetch
} = {}) {
  if (!apiBase) throw new Error("createOrdersObject: 'apiBase' is required");
  const BASE = apiBase.replace(/\/$/, "");

  const res = await fetch(`${BASE}/api/orders?limit=${encodeURIComponent(limit)}`);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg += `: ${j.error}`; } catch {}
    throw new Error(msg);
  }
  const { items = [] } = await res.json();

  // Build the object
  const out = {};
  for (const o of items) {
    const track_url = (o?.track_url ?? "").trim();
    if (!track_url) continue; // filter: only with track_url

    out[o.id] = {
      track_url,
      flags: [], // empty for now, to be filled later
    };
  }

  return out;
}

// /src/services/cttPatch.js

const ALLOWED = new Set(["accepted", "in_transit", "delivered"]);

async function jfetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg += `: ${j.error}`; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Convert flags that might be an array or object into a compact patch object
function toPatch(flags) {
  if (!flags) return {};
  // if it's an array like ["accepted","delivered"]
  if (Array.isArray(flags)) {
    const out = {};
    for (const k of flags) if (ALLOWED.has(k)) out[k] = true;
    return out;
  }
  // if it's an object like {accepted:true, delivered:true, waiting:false}
  const out = {};
  for (const [k, v] of Object.entries(flags)) {
    if (ALLOWED.has(k) && v) out[k] = true; // send only truthy fields
  }
  return out;
}

/**
 * Patch a single order: PATCH /api/orders/:id with { accepted?, in_transit?, delivered? }
 */
export async function patchOrderFlags({ apiBase, orderId, flags }) {
  if (!apiBase) throw new Error("patchOrderFlags: apiBase is required");
  if (!orderId) throw new Error("patchOrderFlags: orderId is required");
  const BASE = apiBase.replace(/\/$/, "");

  const body = toPatch(flags);
  if (!Object.keys(body).length) {
    // nothing to update; mirror server behaviour “NO_ALLOWED_FIELDS”
    return { orderId, skipped: true, reason: "no-allowed-flags" };
  }

  const url = `${BASE}/api/orders/${encodeURIComponent(orderId)}`;
  const result = await jfetch(url, { method: "PATCH", body: JSON.stringify(body) });
  return { orderId, patched: true, body, result };
}

/**
 * Patch many orders from a map like:
 * { [orderId]: { track_url, code, label, flags } }
 * Only patches truthy allowed flags.
 */
export async function patchAllOrderFlags({
  apiBase,
  ordersObj,      // object produced by your builder
  delayMs = 150,  // politeness delay between requests
  dryRun = false, // if true, don't actually PATCH
  logger = console.log,
} = {}) {
  if (!apiBase) throw new Error("patchAllOrderFlags: apiBase is required");
  if (!ordersObj || typeof ordersObj !== "object") throw new Error("patchAllOrderFlags: ordersObj is required");

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let patched = 0, skipped = 0, errors = 0;

  for (const [orderId, rec] of Object.entries(ordersObj)) {
    try {
      const body = toPatch(rec.flags);
      if (!Object.keys(body).length) {
        skipped++; logger(`[PATCH] ${orderId}: no-allowed-flags`);
      } else if (dryRun) {
        skipped++; logger(`[PATCH] ${orderId}: DRY RUN ->`, body);
      } else {
        const out = await patchOrderFlags({ apiBase, orderId, flags: body });
        patched++; logger(`[PATCH] ${orderId}:`, out.body);
      }
    } catch (e) {
      errors++; logger(`[PATCH] ${orderId} error:`, e?.message || String(e));
    }
    if (delayMs) await sleep(delayMs);
  }

  return { total: Object.keys(ordersObj).length, patched, skipped, errors };
}

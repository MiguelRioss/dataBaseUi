// /src/services/cttBulk.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const codeRe = /\b([A-Z]{2}\d{7,15}[A-Z]{2})\b/; // e.g., RT160260734PT

function inferFlagsFromLabel(label = "") {
  const s = label.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const stage =
    /entregue/.test(s) ? 5 :
    /\bem\s*espera\b/.test(s) ? 4 :
    /\bem\s*tr[aâ]ns[ií]to\b/.test(s) || /\bem\s*transito\b/.test(s) ? 3 :
    /\baceite\b/.test(s) ? 2 :
    /aguarda\s+entrada\s+nos\s+ctt/.test(s) ? 1 : 0;

  return {
    waiting_ctt: stage >= 1,
    accepted:    stage >= 2,
    in_transit:  stage >= 3,
    waiting:     stage >= 4,
    delivered:   stage >= 5,
  };
}

// keep only truthy flags, set to true
function compressFlags(flags = {}) {
  const out = {};
  for (const [k, v] of Object.entries(flags)) if (v) out[k] = true;
  return out;
}

/**
 * Build { [orderId]: { track_url, code, label, flags: {accepted:true,...} } }
 * and log it. Calls your API for each code.
 */
export async function buildOrdersObjectWithFlags({
  apiBase,
  limit = 100,
  delayMs = 200,
  statusPath = "/api/ctt", // change to "/api/ctt/status" if that’s your route
  logger = console.log,
} = {}) {
  if (!apiBase) throw new Error("buildOrdersObjectWithFlags: apiBase is required");
  const BASE = apiBase.replace(/\/$/, "");

  // 1) fetch orders once
  const res = await fetch(`${BASE}/api/orders?limit=${encodeURIComponent(limit)}`);
  if (!res.ok) throw new Error(`orders HTTP ${res.status}`);
  const { items = [] } = await res.json();

  // 2) seed object
  const obj = {};
  for (const o of items) {
    const track_url = (o?.track_url ?? "").trim();
    if (!track_url) continue;
    const m = `${o.track_url} ${o.trackId || ""} ${o.tracking || ""} ${o.track || ""}`.match(codeRe);
    const code = m ? m[1] : null;
    if (!code) continue;
    obj[o.id] = { track_url, code, label: null, flags: {} };
  }

  // 3) enrich with flags
  for (const [orderId, rec] of Object.entries(obj)) {
    try {
      const r = await fetch(`${BASE}${statusPath}?id=${encodeURIComponent(rec.code)}`);
      if (!r.ok) throw new Error(`ctt HTTP ${r.status}`);
      const data = await r.json(); // { id, label, flags? }
      const fullFlags = data.flags ?? inferFlagsFromLabel(data.label || "");
      rec.label = data.label || null;
      rec.flags = compressFlags(fullFlags); // <-- object of truthy flags
      logger(`[CTT] ${rec.code} → ${rec.label} ${JSON.stringify(rec.flags)}`);
    } catch (e) {
      rec.error = e?.message || String(e);
      logger(`[CTT] ${rec.code} error: ${rec.error}`);
    }
    if (delayMs) await sleep(delayMs);
  }

  console.log("[ORDERS WITH FLAGS]", obj);
  return obj;
}

// /src/services/cttBulk.js
// Serially fetches flags for every RT…PT found in /api/orders and logs them.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function checkAllCttFlags({
  apiBase,          // e.g., "https://api-new-six.vercel.app"
  limit = 100,      // how many orders to fetch
  delayMs = 200,    // politeness delay between calls
  logger = console.log,
} = {}) {
  if (!apiBase) throw new Error("checkAllCttFlags: apiBase is required");
  const BASE = apiBase.replace(/\/$/, "");
  const codeRe = /\b([A-Z]{2}\d{7,15}[A-Z]{2})\b/; // catches RT160260734PT etc.

  // 1) pull orders
  const res = await fetch(`${BASE}/api/orders?limit=${limit}`);
  if (!res.ok) throw new Error(`orders HTTP ${res.status}`);
  const { items = [] } = await res.json();

  // 2) collect tracking codes (dedup)
  const codes = new Set();
  for (const o of items) {
    const haystack = [
      o.track_url,
      o.trackId,
      o.tracking,
      o.track,
    ].filter(Boolean).join(" ");
    const m = haystack && haystack.match(codeRe);
    if (m) codes.add(m[1]);
  }

  // 3) call your /api/ctt/status per code (serial)
  for (const code of codes) {
    try {
      const r = await fetch(`${BASE}/api/ctt/status?id=${encodeURIComponent(code)}`);
      if (!r.ok) throw new Error(`ctt/status HTTP ${r.status}`);
      const data = await r.json(); // { id, label, flags }
      logger(`[CTT] ${code} →`, data.flags, `(${data.label})`);
    } catch (e) {
      console.error(`[CTT] ${code} error:`, e?.message || String(e));
    }
    if (delayMs) await sleep(delayMs);
  }

  return codes.size;
}

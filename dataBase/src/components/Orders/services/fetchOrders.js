const API_BASE = "https://api-backend-mesodose-2.onrender.com";
export default async function fetchOrders(params = {}) {
  // build URL with optional params (kept simple for now)
  const url = `${API_BASE}/api/orders${params.limit ? `?limit=${encodeURIComponent(params.limit)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
    } catch {}
    throw new Error(msg);
  }

  const body = await res.json();

  // Support both shapes:
  // { items: [...] }  (old)
  // { ok: true, orders: [...] } (new)
  const items = body.items ?? body.orders ?? [];

  // Normalize each order: ensure id exists and parse dates
  const normalized = (items || []).map((o) => {
    // prefer explicit fields if present
    const created = o.createdAt ?? o.written_at ?? o.created_at ?? null;
    const date = created ? new Date(created) : null;

    return {
      ...o,
      // keep original timestamps too
      createdAt: created,
      date,
    };
  });

  // return in same style your previous code expected: { items, count? }
  return { items: normalized, count: normalized.length };
}

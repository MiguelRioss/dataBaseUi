// /services/api/ordersApi.mjs
import { API_BASE } from "../apiBase";

export async function fetchOrders({ limit = 100 } = {}) {
  const res = await fetch(`${API_BASE}/api/orders?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
  return res.json();
}

export async function createOrder(order) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
      if (j?.detail) msg += ` — ${j.detail}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function patchOrder(id, changes) {
  const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
      if (j?.detail) msg += ` — ${j.detail}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

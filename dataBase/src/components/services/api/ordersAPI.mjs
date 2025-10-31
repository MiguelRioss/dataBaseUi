// /services/api/ordersApi.mjs
import { API_BASE } from "../apiBase";

/** Normalize folder names accepted by the backend */
function normalizeFolder(folder) {
  const f = String(folder ?? "").trim().toLowerCase();
  if (f === "archived") return "archive";
  if (f === "ongoing")  return "orders";
  if (f === "orders" || f === "archive" || f === "deleted") return f;
  throw new Error(`Invalid folder "${folder}". Allowed: orders | archive | deleted`);
}

export async function fetchOrders({ folder, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));

  let url;
  if (folder) {
    const norm = normalizeFolder(folder);
    url = `${API_BASE}/api/ordersByFolder/${encodeURIComponent(norm)}?${params}`;
  } else {
    url = `${API_BASE}/api/orders?${params}`;
  }

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    let msg = `fetchOrders failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  // Controller may return {items,...} or a raw array or an object map
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data;           // keep envelope (caller handles)
  if (data?.items && typeof data.items === "object") return data;
  return data;
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch order ${id} (${res.status})`);
  }
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
      if (j?.detail) msg += ` - ${j.detail}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function patchOrder(selector, changes) {
  const payload =
    selector && typeof selector === "object" && !Array.isArray(selector)
      ? { ...selector }
      : { orderId: selector };

  if (changes !== undefined) payload.changes = changes;

  if (!payload.orderId && !payload.orders && !payload.tracking) {
    throw new Error("patchOrder requires an orderId, orders array, or tracking code.");
  }

  const body = JSON.stringify(payload);
  const singleOrderTarget = !!payload.orderId && !payload.orders && !payload.tracking;

  async function sendPatch(url) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.ok) return res.json();

    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
      if (j?.detail) msg += ` - ${j.detail}`;
    } catch {}
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  if (singleOrderTarget) {
    const orderUrl = `${API_BASE}/api/orders/${encodeURIComponent(payload.orderId)}`;
    try {
      return await sendPatch(orderUrl);
    } catch (err) {
      if (err?.status !== 404) throw err; // only fall back when the route truly doesn't exist
    }
  }

  return sendPatch(`${API_BASE}/api/orders`);
}

/* Optional but recommended: put move here too so all order API is centralized */
export async function moveOrders(ids, dest, source) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("moveOrders: 'ids' must be a non-empty array");
  }
  const body = {
    ids,
    dest: normalizeFolder(dest),
    ...(source ? { source: normalizeFolder(source) } : {}),
  };

  const res = await fetch(`${API_BASE}/api/orders/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Failed to move orders (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json(); // { moved, skipped, source, dest }
}

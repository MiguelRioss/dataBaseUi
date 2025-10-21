// /services/api/ordersApi.mjs
import { API_BASE } from "../apiBase";

export async function fetchOrders({ limit = 100 } = {}) {
  const res = await fetch(`${API_BASE}/api/orders?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
  return res.json();
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
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

  if (changes !== undefined) {
    payload.changes = changes;
  }

  if (!payload.orderId && !payload.orders && !payload.tracking) {
    throw new Error("patchOrder requires an orderId, orders array, or tracking code.");
  }

  const body = JSON.stringify(payload);
  const singleOrderTarget =
    !!payload.orderId && !payload.orders && !payload.tracking;

  async function sendPatch(url) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.ok) {
      return res.json();
    }
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
      if (err?.status !== 404) {
        throw err;
      }
      // Fall through to legacy endpoint (/api/orders) when the new route is absent.
    }
  }

  return sendPatch(`${API_BASE}/api/orders`);
}

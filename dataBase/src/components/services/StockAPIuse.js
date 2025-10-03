import { resolveApiBase } from "./apiBase";

export default async function fetchStock(params = {}) {
  const { limit, apiBase } = params;
  const base = (apiBase || resolveApiBase()).replace(/\/$/, "");
  const url = `${base}/api/stock${limit != null ? `?limit=${encodeURIComponent(limit)}` : ""}`;
  const res = await fetch(url);
  const body = await res.json();
  // return in same style your previous code expected: { items, count? }
  return { items: body };
}


// add this
export async function adjustStockAPI(id, delta, apiBase) {
  const rsp = await fetch(`${apiBase}/api/stock/${id}/adjust`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delta }),
  });
  if (!rsp.ok) throw new Error(`Failed to adjust stock: ${rsp.statusText}`);
  return rsp.json();
}

export async function updateStockAPI(id, changes, apiBase) {
  const rsp = await fetch(`${apiBase}/api/stock/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });
  if (!rsp.ok) throw new Error(`Failed to update stock: ${rsp.statusText}`);
  return rsp.json();
}
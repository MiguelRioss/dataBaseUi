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

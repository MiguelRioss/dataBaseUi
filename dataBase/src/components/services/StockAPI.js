import { resolveApiBase } from "./apiBase";

function ensureBase(apiBase) {
  return (apiBase || resolveApiBase() || "").replace(/\/$/, "");
}

export default async function fetchStock(params = {}) {
  const { limit, apiBase } = params;
  const base = ensureBase(apiBase);
  const stockUrl = `${base}/api/stock${
    limit != null ? `?limit=${encodeURIComponent(limit)}` : ""
  }`;

  const [stockRes, productsRes] = await Promise.all([
    fetch(stockUrl),
    fetch(`${base}/api/products`).catch(() => null),
  ]);

  if (!stockRes.ok)
    throw new Error(`Failed to fetch stock (${stockRes.status})`);

  const stockBody = await stockRes.json();
  let products = [];
  if (productsRes && productsRes.ok) {
    try {
      products = await productsRes.json();
    } catch {
      products = [];
    }
  }

  const productsMap = new Map(
    (Array.isArray(products) ? products : []).map((p) => [
      String(p?.id ?? ""),
      p,
    ])
  );

  const stockItems = Array.isArray(stockBody) ? stockBody : stockBody?.items ?? [];

  const items = stockItems.map((item) => {
    const id = String(item?.id ?? "");
    const product = productsMap.get(id);
    const priceInEuros =
      product?.priceInEuros ??
      product?.price ??
      (product?.priceInCents != null ? product.priceInCents / 100 : null);
    const priceInCents =
      product?.priceInCents ??
      (priceInEuros != null ? Math.round(Number(priceInEuros) * 100) : null);

    return {
      ...item,
      id,
      name: item?.name ?? product?.name ?? id,
      stockValue: item?.stockValue ?? product?.stockValue ?? 0,
      priceInEuros: priceInEuros != null ? Number(priceInEuros) : null,
      priceInCents: priceInCents != null ? Number(priceInCents) : null,
    };
  });

  return { items };
}

export async function adjustStockAPI(id, delta, apiBase) {
  const base = ensureBase(apiBase);
  const rsp = await fetch(`${base}/api/stock/${encodeURIComponent(id)}/adjust`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delta }),
  });
  if (!rsp.ok) throw new Error(`Failed to adjust stock: ${rsp.statusText}`);
  return rsp.json();
}

export async function updateStockAPI(id, changes, apiBase) {
  const base = ensureBase(apiBase);
  const rsp = await fetch(`${base}/api/stock/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });
  if (!rsp.ok) throw new Error(`Failed to update stock: ${rsp.statusText}`);
  return rsp.json();
}
